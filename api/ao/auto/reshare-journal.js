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
    const { data, error } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('*')
      .eq('paused', false)
      .order('last_reshared_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(200).json({ ok: true, message: 'No entries available to reshare' });
    }
    entry = data;
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
    message: `${(inserted || []).length} reshare posts scheduled for ${entry.slug}`,
  });
}
