/**
 * POST/GET /api/ao/auto/reshare-journal
 *
 * Picks the next journal entry from ao_reshare_queue and schedules fresh social
 * captions across all automated channels. Called by the weekly cron job and
 * optionally from the Auto chat via signal.
 *
 * Does not require a request body — picks the next entry automatically.
 * Optional body: { slug: string } to force a specific entry.
 *
 * Auth: requires valid AO session OR valid CRON_SECRET (Bearer, x-cron-secret, or ?secret=).
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { toScheduledAt, findNextQueueDate } from '../../../lib/ao/unifiedScheduler.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// LINKEDIN BUSINESS — EXCLUDED FROM AUTOMATED QUEUE
// Pending second LinkedIn developer app approval. Do not re-enable until
// cursor-prompt-linkedin-business-enable.md is executed after approval.
const RESHARE_CHANNELS = [
  { key: 'linkedin_personal', platform: 'linkedin', account_id: 'personal' },
  { key: 'instagram_business', platform: 'instagram', account_id: 'meta' },
  { key: 'facebook_business', platform: 'facebook', account_id: 'meta' },
  { key: 'twitter', platform: 'twitter', account_id: 'personal' },
];

function isValidCronRequest(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const headerSecret = req.headers['x-cron-secret'];
  const querySecret = req.query?.secret;
  return bearer === cronSecret || headerSecret === cronSecret || querySecret === cronSecret;
}

function readJournalFile(slug) {
  const filePath = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal', `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content };
}

function extractJournalImageUrl(frontmatter) {
  return frontmatter?.image_url || frontmatter?.header_image || null;
}

function normalizeInstagramCaption(text) {
  let t = String(text || '').trim().replace(/https?:\/\/[^\s]+/g, '').trim();
  if (!t.includes('Link in bio')) t = `${t}\n\nLink in bio.`.trim();
  return t;
}

/**
 * Uses the Anthropic API with web_search to select the best journal entry
 * to reshare given current ecosystem context and external leadership landscape.
 *
 * Returns the slug of the selected entry, or null if selection fails.
 * Falls back to rotation-based selection (oldest last_reshared_at) on any failure.
 */
async function selectReshareEntryIntelligently(availableEntries) {
  if (!availableEntries || availableEntries.length === 0) return null;

  const entryManifest = availableEntries
    .slice(0, 40)
    .map((e, i) => `${i + 1}. slug: ${e.slug} | title: ${e.title || e.slug} | last reshared: ${e.last_reshared_at ? new Date(e.last_reshared_at).toISOString().split('T')[0] : 'never'}`)
    .join('\n');

  let recentPostsSummary = '';
  try {
    const { data: recentPosts } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('caption, platform, scheduled_at, source_kind, intent')
      .in('status', ['scheduled', 'posted'])
      .order('scheduled_at', { ascending: false })
      .limit(20);

    if (recentPosts && recentPosts.length > 0) {
      const recentLines = recentPosts.slice(0, 10).map((p) => {
        const slug = p.intent?.slug || 'unknown';
        const date = p.scheduled_at ? new Date(p.scheduled_at).toISOString().split('T')[0] : 'unknown';
        const caption = String(p.caption || '').slice(0, 80).trim();
        return `- [${date}] ${slug}: ${caption}...`;
      });
      recentPostsSummary = `Recent posts in queue:\n${recentLines.join('\n')}`;
    }
  } catch (err) {
    console.warn('[reshare-journal] Could not load recent posts for selection context:', err?.message);
  }

  let performanceSummary = '';
  try {
    const { data: topPosts } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('platform, reactions, comments, ao_scheduled_posts!inner(caption, intent)')
      .not('reactions', 'is', null)
      .gt('reactions', 0)
      .order('reactions', { ascending: false })
      .limit(5);

    if (topPosts && topPosts.length > 0) {
      const perfLines = topPosts.map((p) => {
        const slug = p.ao_scheduled_posts?.intent?.slug || 'unknown';
        const caption = String(p.ao_scheduled_posts?.caption || '').slice(0, 60).trim();
        return `- ${slug}: ${p.reactions} reactions on ${p.platform} — "${caption}..."`;
      });
      performanceSummary = `Top performing posts by engagement:\n${perfLines.join('\n')}`;
    }
  } catch (err) {
    console.warn('[reshare-journal] Could not load performance data for selection context:', err?.message);
  }

  const systemPrompt = `You are the AI CMO for Archetype Original, an advisory practice built around servant leadership for founders and executives. You are selecting which existing journal entry to reshare on social media this week.

Your selection must be based on two factors:

1. INTERNAL FIT: What fits the current content ecosystem? What topics have been running recently? What is performing well? What has been absent? The entry should feel intentional relative to what has already gone out.

2. EXTERNAL FIT: What is happening in the leadership conversation right now? What news, trends, or cultural moments make one of these entries suddenly more relevant? A post about manufactured crisis hits different when there is a real leadership failure in the news.

You have access to web_search. Use it to find 2-3 current leadership news stories, trends, or conversations. Then match the best available entry to that external moment.

Selection rules:
- Never select an entry that was reshared in the past 30 days (check last_reshared_at dates)
- Prefer entries that have never been reshared over entries that have been reshared multiple times
- Prefer entries that connect to current external events
- Prefer entries that fill a gap in recent ecosystem content rather than repeat a theme already in the queue
- Choose one entry. Return its slug and a one-sentence explanation of why it fits this moment.

Respond with ONLY a JSON object in this exact format:
{
  "slug": "the-selected-slug",
  "reason": "One sentence explaining why this entry fits this week."
}

No preamble. No explanation. No markdown. Only the JSON object.`;

  const userPrompt = `Today's date: ${new Date().toISOString().split('T')[0]}

Available journal entries to reshare:
${entryManifest}

${recentPostsSummary}

${performanceSummary}

Search for current leadership news and trends, then select the best entry from the list above. Return only the JSON object.`;

  try {
    const response = await client.messages.create({
      model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        },
      ],
    });

    const textBlock = response.content?.find((b) => b.type === 'text');
    if (!textBlock?.text) {
      console.warn('[reshare-journal] Intelligent selection returned no text block — falling back to rotation');
      return null;
    }

    const clean = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!parsed?.slug) {
      console.warn('[reshare-journal] Intelligent selection returned invalid JSON — falling back to rotation');
      return null;
    }

    const match = availableEntries.find((e) => e.slug === parsed.slug);
    if (!match) {
      console.warn(`[reshare-journal] Intelligent selection returned unknown slug "${parsed.slug}" — falling back to rotation`);
      return null;
    }

    console.log(`[reshare-journal] Intelligent selection: ${parsed.slug} — ${parsed.reason}`);
    return { slug: parsed.slug, reason: parsed.reason };
  } catch (err) {
    console.error('[reshare-journal] Intelligent selection failed:', err?.message || err);
    return null;
  }
}

async function generateReshareCaption(slug, title, body, journalUrl) {
  const excerpt = body.length > 3000 ? `${body.slice(0, 3000)}\n...` : body;

  const systemPrompt = `You are Auto, Bart Paden's AI CMO. Your job is to write fresh social media captions that reshare one of Bart's existing journal posts to a new audience.

Bart's voice rules — non-negotiable:
- No em dashes. Ever. Rewrite the sentence instead.
- No AI signature phrases: "it's worth noting", "at its core", "furthermore", "moreover", "this highlights", "not only X but also Y"
- Short sentences. Direct. No stacked subordinate clauses.
- No hedging. No throat-clearing. No summaries that restate instead of land.
- First person where appropriate. Bart is the author.
- Write as if this is new content, not a repost. Surface a fresh angle, a provocative line from the article, or a question the content answers.

Write four captions. Return them as a JSON object with exactly these keys:
{
  "linkedin_personal": "...",
  "instagram_business": "...",
  "facebook_business": "...",
  "twitter": "..."
}

Rules per platform:
- linkedin_personal: 900-1200 characters. Conversational. Can be longer-form. Include the URL on its own line at the end. 3-5 hashtags.
- instagram_business: 180-220 characters of text. No URL (will be replaced with Link in bio). 5-7 hashtags.
- facebook_business: 300-500 characters. Include the URL. 3-4 hashtags.
- twitter: Under 240 characters total including URL. No hashtags.

Return ONLY the JSON object. No preamble. No explanation. No markdown code fences.`;

  const userPrompt = `Journal title: ${title}
Journal URL: ${journalUrl}

Article content:
${excerpt}

Write four reshare captions for this article. Surface a fresh angle. Do not summarize the whole piece. Pick one idea, one question, one provocation that makes someone want to read it.`;

  const response = await client.messages.create({
    model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('[reshare-journal] Failed to parse caption JSON:', e.message);
    console.error('[reshare-journal] Raw response:', text);
    throw new Error('Caption generation returned invalid JSON');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const isCron = isValidCronRequest(req);
  if (!isCron) {
    const auth = requireAoSession(req, res);
    if (!auth) return;
  }

  const forcedSlug = req.body?.slug || req.query?.slug || null;

  let entry;
  let selectionReason = '';

  if (forcedSlug) {
    const { data, error } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('*')
      .eq('slug', forcedSlug)
      .eq('paused', false)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: `Slug not found or paused: ${forcedSlug}` });
    }
    entry = data;
  } else {
    const { data: allEntries, error: allError } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('*')
      .eq('paused', false)
      .order('last_reshared_at', { ascending: true, nullsFirst: true });

    if (allError || !allEntries || allEntries.length === 0) {
      return res.status(200).json({ ok: true, message: 'No entries available to reshare' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const eligible = allEntries.filter(
      (e) => !e.last_reshared_at || new Date(e.last_reshared_at) < thirtyDaysAgo
    );

    if (eligible.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'All entries were reshared within the past 30 days — nothing to reshare this week',
      });
    }

    const intelligentSelection = await selectReshareEntryIntelligently(eligible);

    if (intelligentSelection?.slug) {
      entry = allEntries.find((e) => e.slug === intelligentSelection.slug);
      selectionReason = intelligentSelection.reason;
    } else {
      console.log('[reshare-journal] Falling back to rotation-based selection');
      entry = eligible[0];
      selectionReason = 'Selected by rotation (oldest last reshared date)';
    }
  }

  if (!entry) {
    return res.status(500).json({ ok: false, error: 'Could not resolve entry to reshare' });
  }

  const journal = readJournalFile(entry.slug);
  if (!journal) {
    console.error(`[reshare-journal] Journal file not found for slug: ${entry.slug}`);
    await supabaseAdmin
      .from('ao_reshare_queue')
      .update({ paused: true })
      .eq('slug', entry.slug);
    return res.status(404).json({ ok: false, error: `Journal file not found: ${entry.slug}` });
  }

  const title = entry.title || journal.frontmatter?.title || entry.slug;
  const journalUrl = `https://www.archetypeoriginal.com/journal/${entry.slug}`;
  const imageUrl = extractJournalImageUrl(journal.frontmatter);

  let captions;
  try {
    captions = await generateReshareCaption(entry.slug, title, journal.body, journalUrl);
  } catch (err) {
    console.error('[reshare-journal] Caption generation failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Caption generation failed', detail: err.message });
  }

  const scheduleDate = await findNextQueueDate(2);

  const rows = [];
  for (const ch of RESHARE_CHANNELS) {
    const rawCaption = captions[ch.key];
    if (!rawCaption) continue;

    let text = String(rawCaption).trim();
    if (ch.platform === 'instagram') {
      text = normalizeInstagramCaption(text);
    }

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: await toScheduledAt(scheduleDate, ch.platform),
      text,
      caption: text,
      image_url: imageUrl || null,
      status: 'scheduled',
      source_kind: 'ao_journal_reshare',
      intent: {
        auto_hub: true,
        channel_label: ch.key,
        slug: entry.slug,
        journal_slug: entry.slug,
        title,
        journal_url: journalUrl,
        reshare: true,
        created_by_email: 'bart@archetypeoriginal.com',
      },
    });
  }

  if (rows.length === 0) {
    return res.status(500).json({ ok: false, error: 'No captions were generated for any channel' });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(rows)
    .select('id, platform, scheduled_at, status');

  if (insertError) {
    console.error('[reshare-journal] Insert error:', insertError.message);
    return res.status(500).json({ ok: false, error: insertError.message });
  }

  await supabaseAdmin
    .from('ao_reshare_queue')
    .update({
      last_reshared_at: new Date().toISOString(),
      reshare_count: (entry.reshare_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', entry.slug);

  console.log(`[reshare-journal] Reshared ${entry.slug} — ${rows.length} posts scheduled for ${scheduleDate.toISOString().split('T')[0]}`);

  return res.status(200).json({
    ok: true,
    slug: entry.slug,
    title,
    journal_url: journalUrl,
    schedule_date: scheduleDate.toISOString().split('T')[0],
    scheduled: inserted || [],
    total: (inserted || []).length,
    captions,
    selection_reason: selectionReason || 'Selected by rotation',
    message: `${(inserted || []).length} reshare posts scheduled for ${entry.slug}`,
  });
}
