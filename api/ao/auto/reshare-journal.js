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
import { toScheduledAt } from '../../../lib/ao/unifiedScheduler.js';

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

const BART_PHOTOS = {
  confrontational: [
    { file: 'Bart-32.jpg' },
    { file: 'Bart-44.jpg' },
    { file: 'Bart-141.jpg' },
    { file: 'Bart-97.jpg' },
  ],
  working: [
    { file: 'Bart-1.jpg' },
    { file: 'Bart-4.jpg' },
    { file: 'Bart-8.jpg' },
  ],
  reflective: [
    { file: 'Bart-52.jpg' },
    { file: 'Bart-78.jpg' },
    { file: 'Bart-87.jpg' },
  ],
};

const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';

function selectPhotoForArticle(mood) {
  const pool = BART_PHOTOS[mood] || BART_PHOTOS.confrontational;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    file: pick.file,
    url: `${SITE_BASE_URL}/images/${pick.file}`,
  };
}

async function extractPullQuote(title, body, anthropicClient, model) {
  const excerpt = body.length > 4000 ? body.slice(0, 4000) : body;
  try {
    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `From this article, extract the single most shareable pull quote. Must be a real line from the text, word for word. No paraphrasing. Find the most counterintuitive, direct, or scroll-stopping line. Under 150 characters preferred.

Return ONLY the quote. No quotation marks. No attribution. No preamble.

Title: ${title}

Article:
${excerpt}`,
      }],
    });
    const quote = response.content?.[0]?.text?.trim() || '';
    if (!quote || quote.length < 10 || quote.length > 220) return null;
    return quote;
  } catch (err) {
    console.warn('[reshare-journal] Pull quote extraction failed:', err?.message);
    return null;
  }
}

async function detectArticleMood(title, body, anthropicClient, model) {
  try {
    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Classify this leadership article's dominant tone.
Return ONLY one word: confrontational, working, or reflective.
confrontational = challenges, calls out bad behavior, strong stance
working = practical, strategic, process-oriented
reflective = personal, philosophical, story-based

Title: ${title}
Opening: ${body.slice(0, 1000)}`,
      }],
    });
    const mood = response.content?.[0]?.text?.trim().toLowerCase() || '';
    return ['confrontational', 'working', 'reflective'].includes(mood) ? mood : 'confrontational';
  } catch {
    return 'confrontational';
  }
}

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

async function generateReshareCaption(slug, title, body, journalUrl, corpusContext, captionPatterns) {
  const excerpt = body.length > 3000 ? `${body.slice(0, 3000)}\n...` : body;

  const corpusSection = corpusContext && corpusContext.length > 0
    ? `\n\nRELATED WRITING FROM BART'S CORPUS (for voice and thematic continuity):\n${corpusContext
        .slice(0, 4)
        .map((doc) => `--- ${doc.title} ---\n${String(doc.body_preview || doc.summary || '').slice(0, 600)}`)
        .join('\n\n')}`
    : '';

  const patternSection = captionPatterns && captionPatterns.length > 0
    ? `\n\nTOP PERFORMING CAPTION PATTERNS (study these for what resonates with this audience):\n${captionPatterns
        .slice(0, 5)
        .map((p) => `[${p.platform} — ${p.reactions || 0} reactions]\n${String(p.caption || '').slice(0, 200)}`)
        .join('\n\n')}`
    : '';

  const systemPrompt = `You are Auto, Bart Paden's AI CMO. You are writing fresh social media captions to resurface one of Bart's existing journal posts for SEO and reach.

CONTEXT ON WHAT YOU ARE DOING:
This is not a new post. This is a strategic resurface. The article already exists. Your job is to find the angle that makes it feel urgent and worth reading TODAY. Think like a CMO who has studied this body of work and knows exactly which idea from this article will land hardest given what is happening in the leadership conversation right now.

BART'S VOICE — NON-NEGOTIABLE:
- No em dashes. Ever. Rewrite the sentence instead.
- No AI signature phrases: "it's worth noting", "at its core", "furthermore", "moreover", "this highlights", "not only X but also Y", "in many ways", "navigate"
- Short sentences. Direct. No stacked subordinate clauses.
- No hedging. No throat-clearing. No summaries that restate instead of land.
- First person where appropriate. Bart is the author.
- Pick ONE idea, ONE question, ONE provocation. Do not cover the whole article.
- The related corpus writing shows you how Bart thinks and what he has already said on adjacent topics. Use it to find the angle he has NOT led with before on this theme.
- Study the top performing caption patterns. They show you what this audience responds to. Match that energy.

RESHARE FRAMING RULES:
- Write as if this is new content being published today, not a repost.
- Never say "resharing", "throwback", "previously", or "I wrote this a while ago."
- The goal is reach and SEO. The caption should make someone who has never seen this article want to read it immediately.
- Surface the most provocative or counterintuitive idea in the article.

Write four captions. Return them as a JSON object with exactly these keys:
{
  "linkedin_personal": "...",
  "instagram_business": "...",
  "facebook_business": "...",
  "twitter": "..."
}

Rules per platform:
- linkedin_personal: 900-1200 characters. Conversational. Lead with a strong first line that stops the scroll. Include the URL on its own line at the end. 3-5 hashtags.
- instagram_business: 180-220 characters of caption text. No URL (replaced with Link in bio). 5-7 hashtags. First line must stop the scroll.
- facebook_business: 300-500 characters. Include the URL. 3-4 hashtags.
- twitter: Under 240 characters total including URL. No hashtags. One sharp idea only.

Return ONLY the JSON object. No preamble. No explanation. No markdown code fences.`;

  const userPrompt = `Journal title: ${title}
Journal URL: ${journalUrl}

Article content:
${excerpt}${corpusSection}${patternSection}

Write four reshare captions. Lead with the most provocative or counterintuitive idea. Make it feel urgent today.`;

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

  // Pull quote extraction
  let pullQuote = null;
  try {
    pullQuote = await extractPullQuote(title, journal.body, client, process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6');
    if (pullQuote) console.log(`[reshare-journal] Pull quote extracted: "${pullQuote.slice(0, 80)}"`);
  } catch (err) {
    console.warn('[reshare-journal] Pull quote failed:', err?.message);
  }

  // Photo mood selection
  const mood = await detectArticleMood(title, journal.body, client, process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6');
  const selectedPhoto = selectPhotoForArticle(mood);
  console.log(`[reshare-journal] Mood: ${mood} — Photo: ${selectedPhoto.file}`);

  // Image generation
  let reshareImageUrl = null;
  if (pullQuote) {
    try {
      const selfBase = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const imgRes = await fetch(`${selfBase}/api/ao/auto/generate-reshare-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          slug: entry.slug,
          pull_quote: pullQuote,
          photo: selectedPhoto.file,
          photo_url: selectedPhoto.url,
        }),
      });
      const imgJson = await imgRes.json().catch(() => ({}));
      if (imgRes.ok && imgJson.ok) {
        reshareImageUrl = imgJson.image_url;
        console.log(`[reshare-journal] Image generated: ${reshareImageUrl}`);
      } else {
        console.warn('[reshare-journal] Image generation failed:', imgJson.error);
      }
    } catch (err) {
      console.warn('[reshare-journal] Image request failed:', err?.message);
    }
  }

  // Fetch corpus context — semantic search on the article's title and opening
  // paragraph to find the most thematically related writing in Bart's corpus.
  let corpusContext = [];
  try {
    const { searchCorpus } = await import('../../../lib/ao/corpusEmbeddings.js');
    const queryText = `${title}\n\n${journal.body.slice(0, 800)}`;
    const results = await searchCorpus(queryText, {
      threshold: 0.35,
      maxResults: 6,
    });
    // Exclude the article being reshared itself
    corpusContext = results.filter((r) => r.slug !== entry.slug);
    console.log(`[reshare-journal] Corpus context: ${corpusContext.length} related documents found`);
  } catch (err) {
    console.warn('[reshare-journal] Corpus search failed, proceeding without context:', err?.message);
  }

  // Fetch top-performing caption patterns from metrics
  let captionPatterns = [];
  try {
    const { data: topMetrics } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('platform, reactions, comments, ao_scheduled_posts!inner(caption, platform)')
      .not('reactions', 'is', null)
      .gt('reactions', 0)
      .order('reactions', { ascending: false })
      .limit(10);

    if (topMetrics && topMetrics.length > 0) {
      captionPatterns = topMetrics.map((m) => ({
        platform: m.platform,
        reactions: m.reactions,
        comments: m.comments,
        caption: m.ao_scheduled_posts?.caption || '',
      }));
      console.log(`[reshare-journal] Caption patterns: ${captionPatterns.length} top performers loaded`);
    }
  } catch (err) {
    console.warn('[reshare-journal] Could not load caption patterns:', err?.message);
  }

  let captions;
  try {
    captions = await generateReshareCaption(entry.slug, title, journal.body, journalUrl, corpusContext, captionPatterns);
  } catch (err) {
    console.error('[reshare-journal] Caption generation failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Caption generation failed', detail: err.message });
  }

  // Check auto_approve setting
  let autoApprove = false;
  try {
    const { data: settings } = await supabaseAdmin
      .from('ao_reshare_settings')
      .select('auto_approve')
      .eq('owner_email', 'bart@archetypeoriginal.com')
      .single();
    autoApprove = !!settings?.auto_approve;
  } catch (_) {
    // Default to review mode if settings cannot be loaded
  }

  let scheduleDay = null;
  if (autoApprove) {
    // Auto-approve mode: find the best day this week and schedule immediately
    try {
      const today = new Date();
      let bestDayOffset = 1;

      const { data: metrics } = await supabaseAdmin
        .from('ao_scheduled_post_metrics')
        .select('posted_at_utc, engagement_score')
        .not('posted_at_utc', 'is', null)
        .not('engagement_score', 'is', null)
        .gt('engagement_score', 0)
        .order('posted_at_utc', { ascending: false })
        .limit(60);

      if (metrics && metrics.length >= 5) {
        const dayScores = {};
        for (const m of metrics) {
          const d = new Date(m.posted_at_utc);
          const dow = d.getDay();
          if (dow === 0 || dow === 6) continue;
          if (!dayScores[dow]) dayScores[dow] = { total: 0, count: 0 };
          dayScores[dow].total += Number(m.engagement_score);
          dayScores[dow].count += 1;
        }
        let bestDow = null;
        let bestAvg = -1;
        for (const [dow, { total, count }] of Object.entries(dayScores)) {
          const avg = total / count;
          if (avg > bestAvg) {
            bestAvg = avg;
            bestDow = parseInt(dow, 10);
          }
        }
        if (bestDow !== null) {
          for (let offset = 1; offset <= 7; offset++) {
            const candidate = new Date(today);
            candidate.setDate(today.getDate() + offset);
            if (candidate.getDay() === bestDow) {
              bestDayOffset = offset;
              break;
            }
          }
        }
      }

      // Find a day this week with no reshare already scheduled
      for (let attempt = 0; attempt < 7; attempt++) {
        const candidate = new Date(today);
        candidate.setDate(today.getDate() + bestDayOffset + attempt);
        const ymd = candidate.toISOString().split('T')[0];
        const dow = candidate.getDay();
        if (dow === 0 || dow === 6) continue;
        const { data: existing } = await supabaseAdmin
          .from('ao_scheduled_posts')
          .select('id')
          .eq('source_kind', 'ao_journal_reshare')
          .in('status', ['scheduled', 'pending_review'])
          .gte('scheduled_at', `${ymd}T00:00:00Z`)
          .lt('scheduled_at', `${ymd}T23:59:59Z`)
          .limit(1);
        if (!existing || existing.length === 0) {
          scheduleDay = candidate;
          break;
        }
      }
      if (!scheduleDay) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        scheduleDay = tomorrow;
      }
    } catch (err) {
      console.warn('[reshare-journal] Day selection failed:', err?.message);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      scheduleDay = tomorrow;
    }
  }

  // Build rows
  const rows = [];
  const now = new Date().toISOString();

  // Validate that captions were generated for all channels before inserting any rows.
  // A reshare post with no caption posts blank — never allow this.
  const missingChannels = RESHARE_CHANNELS.filter(
    (ch) => !captions[ch.key] || !String(captions[ch.key]).trim()
  );
  if (missingChannels.length > 0) {
    console.error(
      `[reshare-journal] Missing captions for channels: ${missingChannels.map((c) => c.key).join(', ')}`
    );
    return res.status(500).json({
      ok: false,
      error: `Caption generation failed for channels: ${missingChannels.map((c) => c.key).join(', ')}. Reshare aborted. No rows inserted.`,
    });
  }

  for (const ch of RESHARE_CHANNELS) {
    const rawCaption = captions[ch.key];
    if (!rawCaption) continue;

    let text = String(rawCaption).trim();
    if (ch.platform === 'instagram') {
      text = normalizeInstagramCaption(text);
    }

    const scheduledAt =
      autoApprove && scheduleDay ? await toScheduledAt(scheduleDay, ch.platform) : now; // placeholder — replaced on approve

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      image_url: reshareImageUrl || imageUrl || null,
      status: autoApprove ? 'scheduled' : 'pending_review',
      source_kind: 'ao_journal_reshare',
      intent: {
        auto_hub: true,
        channel_label: ch.key,
        slug: entry.slug,
        journal_slug: entry.slug,
        title,
        journal_url: journalUrl,
        reshare: true,
        selection_reason: selectionReason,
        created_by_email: 'bart@archetypeoriginal.com',
        pull_quote: pullQuote || null,
        photo: selectedPhoto.file,
        photo_mood: mood,
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

  const insertedIds = (inserted || []).map((r) => r.id);

  // Update ao_reshare_queue
  await supabaseAdmin
    .from('ao_reshare_queue')
    .update({
      last_reshared_at: new Date().toISOString(),
      reshare_count: (entry.reshare_count || 0) + 1,
      selection_reason: selectionReason,
      pending_review_ids: autoApprove ? [] : insertedIds,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', entry.slug);

  const scheduleInfo =
    autoApprove && scheduleDay
      ? `Scheduled for ${scheduleDay.toISOString().split('T')[0]}.`
      : 'Pending your review in Settings.';

  console.log(
    `[reshare-journal] ${autoApprove ? 'Auto-approved' : 'Pending review'}: ${entry.slug} — ${rows.length} posts. ${scheduleInfo}`
  );

  return res.status(200).json({
    ok: true,
    slug: entry.slug,
    title,
    journal_url: journalUrl,
    status: autoApprove ? 'scheduled' : 'pending_review',
    schedule_date: autoApprove && scheduleDay ? scheduleDay.toISOString().split('T')[0] : null,
    pending_review: !autoApprove,
    posts: inserted || [],
    total: (inserted || []).length,
    captions,
    pull_quote: pullQuote || null,
    image_url: reshareImageUrl || null,
    photo: selectedPhoto.file,
    photo_mood: mood,
    selection_reason: selectionReason || 'Selected by rotation',
    message: autoApprove
      ? `${(inserted || []).length} reshare posts scheduled for ${scheduleDay?.toISOString().split('T')[0]}.`
      : `${(inserted || []).length} reshare posts are pending your review in Settings.`,
  });
}
