/**
 * POST/GET /api/ao/auto/reshare-journal
 *
 * Picks the next journal entry from ao_reshare_queue and schedules fresh social
 * captions across all automated channels. Called by the weekly cron job,
 * Settings, and Auto chat (in-process via runReshareCycle — never via HTTP self-fetch).
 *
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
import { getOpenAiKey } from '../../../lib/openaiKey.js';

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

/**
 * Retries a Claude API call on transient "overloaded" errors.
 */
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1500, label = 'call' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const message = String(err?.message || err || '');
      const isOverloaded = /overloaded/i.test(message) || err?.status === 529;
      if (!isOverloaded || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * attempt;
      console.warn(`[reshare-journal] ${label} overloaded (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
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
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    return { frontmatter: data, body: content };
  } catch (err) {
    console.error(`[reshare-journal] Failed to read/parse journal file for slug "${slug}":`, err?.message || err);
    return null;
  }
}

function extractJournalImageUrl(frontmatter) {
  return frontmatter?.image_url || frontmatter?.header_image || null;
}

function normalizeInstagramCaption(text) {
  let t = String(text || '').trim().replace(/https?:\/\/[^\s]+/g, '').trim();
  if (!t.includes('Link in bio')) t = `${t}\n\nLink in bio.`.trim();
  return t;
}

function selectPhotoForArticle(mood) {
  const pool = BART_PHOTOS[mood] || BART_PHOTOS.confrontational;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    file: pick.file,
    url: `${SITE_BASE_URL}/images/${pick.file}`,
  };
}

async function extractPullQuote(title, body) {
  const excerpt = body.length > 4000 ? `${body.slice(0, 4000)}\n...` : body;
  const systemPrompt = `You extract a single pull quote from an article, verbatim, for use as a
featured quote in a social media graphic. The quote must be an EXACT sentence or short
passage copied directly from the article text below — do not paraphrase, do not invent, do not
combine two separate sentences. Pick the single most striking, standalone line: the one that
would make someone stop scrolling. It should read as a complete thought without needing the rest
of the article for context. Prefer a short line (under 160 characters) over a long one.

Respond with ONLY a JSON object: {"quote": "the exact sentence from the article"}
No preamble, no markdown, no explanation.`;

  const userPrompt = `Title: ${title}\n\nArticle:\n${excerpt}`;

  try {
    const response = await withRetry(
      () =>
        client.messages.create({
          model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      { label: 'extractPullQuote' }
    );
    const text = response.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!parsed?.quote || typeof parsed.quote !== 'string') return null;
    return parsed.quote.trim();
  } catch (err) {
    console.error('[reshare-journal] extractPullQuote failed:', err?.message || err);
    return null;
  }
}

async function detectArticleMood(title, body) {
  const excerpt = body.length > 2000 ? `${body.slice(0, 2000)}\n...` : body;
  const systemPrompt = `Classify the dominant emotional tone of this article as exactly one of:
confrontational, working, reflective.

- confrontational: challenges the reader directly, calls out a common failure or excuse
- working: practical, tactical, "here's how to do the thing"
- reflective: personal, story-driven, introspective

Respond with ONLY a JSON object: {"mood": "confrontational" | "working" | "reflective"}`;

  const userPrompt = `Title: ${title}\n\nArticle:\n${excerpt}`;

  try {
    const response = await withRetry(
      () =>
        client.messages.create({
          model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 100,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      { label: 'detectArticleMood' }
    );
    const text = response.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const mood = parsed?.mood;
    if (mood === 'confrontational' || mood === 'working' || mood === 'reflective') return mood;
    return 'reflective';
  } catch (err) {
    console.error('[reshare-journal] detectArticleMood failed, defaulting to reflective:', err?.message || err);
    return 'reflective';
  }
}

/**
 * OpenAI image EDIT endpoint with Bart's real photo as input — separate from generateDesignImage.
 */
async function editPhotoWithDallE({ photoPath, prompt, size }) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    console.error('[reshare-journal] editPhotoWithDallE: OpenAI API key not configured');
    return null;
  }
  try {
    const imageBuffer = fs.readFileSync(photoPath);
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    // Pass a real Uint8Array copy so multipart encoding never sees a pooled Buffer view.
    form.append(
      'image',
      new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }),
      path.basename(photoPath)
    );
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', 'high');
    // Force raster PNG — napi-rs loadImage rejects unknown/non-raster payloads with
    // the misleading "Invalid SVG image" error.
    form.append('output_format', 'png');

    const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => '');
      console.error('[reshare-journal] OpenAI image edit error:', openaiRes.status, errText.slice(0, 300));
      return null;
    }

    const data = await openaiRes.json();
    let b64 = data?.data?.[0]?.b64_json;
    const tempUrl = data?.data?.[0]?.url;

    // Strip accidental data-URL prefix if the API ever returns one inside b64_json.
    if (typeof b64 === 'string') {
      const dataUrlMatch = b64.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
      if (dataUrlMatch) b64 = dataUrlMatch[1];
    }

    let buffer = null;
    if (b64) {
      buffer = Buffer.from(b64, 'base64');
    } else if (tempUrl) {
      const imgRes = await fetch(tempUrl);
      if (!imgRes.ok) {
        console.error('[reshare-journal] OpenAI image URL download failed:', imgRes.status);
        return null;
      }
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      console.error('[reshare-journal] OpenAI image edit returned no b64_json or url');
      return null;
    }

    const magicHex = buffer.subarray(0, 8).toString('hex');
    const isPng = magicHex.startsWith('89504e47');
    const isJpeg = magicHex.startsWith('ffd8ff');
    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    console.log(
      '[reshare-journal] editPhotoWithDallE decoded buffer length:',
      buffer.length,
      'magic:',
      magicHex,
      'format:',
      isPng ? 'png' : isJpeg ? 'jpeg' : isWebp ? 'webp' : 'unknown'
    );

    if (!isPng && !isJpeg && !isWebp) {
      console.error(
        '[reshare-journal] editPhotoWithDallE returned non-raster bytes (napi-rs would throw Invalid SVG image). Rejecting.'
      );
      return null;
    }

    return { buffer };
  } catch (err) {
    console.error('[reshare-journal] editPhotoWithDallE failed:', err?.message || err);
    return null;
  }
}

async function generateReshareImage(title, pullQuote, mood) {
  if (!pullQuote) return null;
  const selectedPhoto = selectPhotoForArticle(mood);
  const photoPath = path.join(process.cwd(), 'public/images', selectedPhoto.file);

  if (!fs.existsSync(photoPath)) {
    console.error(`[reshare-journal] Selected photo not found on disk: ${photoPath}`);
    return null;
  }

  const stylePrompt =
    mood === 'confrontational'
      ? 'bold, high-contrast, direct — a challenge on the page'
      : mood === 'working'
        ? 'clean, structured, practical'
        : 'quiet, warm, personal';

  const prompt = `Adjust only the background and lighting of this photo to feel ${stylePrompt}, using a dark charcoal tone consistent with a professional leadership brand. Do not add any text, words, letters, logos, wordmarks, or graphic overlays of any kind — the image must contain nothing but the photo itself with adjusted background and lighting. Do not alter the subject's face, body, proportions, expression, clothing, or identity in any way — preserve their exact likeness. No stock-photo clichés, no cheesy corporate imagery.`;

  const edited = await editPhotoWithDallE({ photoPath, prompt, size: '1536x1024' });
  // If the model edit produced unusable bytes (or failed), fall back to the real photo
  // so compositing still produces an on-brand graphic instead of aborting the reshare.
  const photoBuffer = edited?.buffer || fs.readFileSync(photoPath);
  if (!edited?.buffer) {
    console.warn(
      '[reshare-journal] Using original photo for compositing — DALL-E edit missing or returned non-raster bytes'
    );
  }

  const { generateReshareCardImage } = await import('../../../lib/ao/generateReshareCardImage.js');
  const composited = await generateReshareCardImage({ photoBuffer, pullQuote, mood });
  if (!composited?.ok || !composited.buffer) {
    console.error('[reshare-journal] generateReshareCardImage failed:', composited?.error);
    return null;
  }

  const timestamp = Date.now();
  const filename = `reshare-1536-1024-${timestamp}.png`;
  const storagePath = `ao-design-images/${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('ao-auto-attachments')
    .upload(storagePath, composited.buffer, { contentType: 'image/png', upsert: false });

  if (uploadError) {
    console.error('[reshare-journal] Final composited image upload error:', uploadError.message);
    return null;
  }

  const { data: urlData } = supabaseAdmin.storage.from('ao-auto-attachments').getPublicUrl(storagePath);
  if (!urlData?.publicUrl) return null;

  return {
    image_url: urlData.publicUrl,
    photo: selectedPhoto.file,
    photo_url: selectedPhoto.url,
  };
}

/**
 * Branded landscape image for opportunity companion posts — same pipeline as reshare
 * (photo edit → canvas composite with real pull quote + AO logo). Exported for chat.js.
 */
export async function generateBrandedOpportunityImage({ title, body, pullQuote }) {
  const quote =
    String(pullQuote || '').trim() ||
    (await extractPullQuote(title || 'Companion post', body || '')) ||
    '';
  if (!quote) {
    return { ok: false, error: 'Could not determine a pull quote for the branded image' };
  }
  const mood = await detectArticleMood(title || 'Companion post', body || '');
  const generated = await generateReshareImage(title || 'Companion post', quote, mood);
  if (!generated?.image_url) {
    return { ok: false, error: 'Branded image generation failed' };
  }
  return {
    ok: true,
    image_url: generated.image_url,
    pull_quote: quote,
    mood,
    photo: generated.photo || null,
    photo_url: generated.photo_url || null,
  };
}

async function getCorpusContext(currentSlug, title) {
  void title;
  let relatedWriting = '';
  let topCaptionPatterns = '';

  try {
    const { data: related } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('slug, title')
      .neq('slug', currentSlug)
      .eq('paused', false)
      .limit(6);
    if (related && related.length > 0) {
      relatedWriting = `Other pieces in Bart's body of work (for voice/thematic context only, do not reference by name unless it fits naturally):\n${related.map((r) => `- ${r.title || r.slug}`).join('\n')}`;
    }
  } catch (err) {
    console.warn('[reshare-journal] getCorpusContext related-writing lookup failed:', err?.message);
  }

  try {
    const { data: topPosts } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('caption, reactions, ao_scheduled_posts!inner(caption)')
      .not('reactions', 'is', null)
      .gt('reactions', 0)
      .order('reactions', { ascending: false })
      .limit(3);
    if (topPosts && topPosts.length > 0) {
      const lines = topPosts.map((p) => {
        const caption = String(p.ao_scheduled_posts?.caption || p.caption || '')
          .slice(0, 150)
          .trim();
        return `- "${caption}..." (${p.reactions} reactions)`;
      });
      topCaptionPatterns = `Caption patterns that performed well historically (match this energy/structure where it fits naturally, do not copy):\n${lines.join('\n')}`;
    }
  } catch (err) {
    console.warn('[reshare-journal] getCorpusContext top-caption lookup failed:', err?.message);
  }

  return { relatedWriting, topCaptionPatterns };
}

async function selectReshareEntryIntelligently(availableEntries) {
  if (!availableEntries || availableEntries.length === 0) return null;

  const entryManifest = availableEntries
    .slice(0, 40)
    .map(
      (e, i) =>
        `${i + 1}. slug: ${e.slug} | title: ${e.title || e.slug} | last reshared: ${e.last_reshared_at ? new Date(e.last_reshared_at).toISOString().split('T')[0] : 'never'}`
    )
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

Also assess whether the external research surfaced something significant enough to be its own opportunity — a named report, a real statistic, a real event — versus routine background context. Set signal_strength accordingly:

- "none" — nothing external drove the pick beyond general topical relevance; this is the normal, common case.
- "notable" — there's a real, nameable external hook (an industry report, a specific event, a clear trend) but it's not overwhelming.
- "strong" — the kind of alignment where a real report or statistic directly validates or connects to the corpus in a way that deserves more than a single caption line. Use this rarely — it should be uncommon, not the default.

Respond with ONLY a JSON object in this exact format:
{
  "slug": "the-selected-slug",
  "reason": "One sentence explaining why this entry fits this week.",
  "signal_strength": "none" | "notable" | "strong",
  "signal_summary": "1-3 sentences describing the specific external finding (name the report/source/stat if there is one), or empty string if signal_strength is 'none'",
  "signal_source_name": "The name of the report/article/event, or null if none"
}

No preamble. No explanation. No markdown. Only the JSON object.`;

  const userPrompt = `Today's date: ${new Date().toISOString().split('T')[0]}

Available journal entries to reshare:
${entryManifest}

${recentPostsSummary}

${performanceSummary}

Search for current leadership news and trends, then select the best entry from the list above. Return only the JSON object.`;

  try {
    const response = await withRetry(
      () =>
        client.messages.create({
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
        }),
      { label: 'selectReshareEntryIntelligently' }
    );

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
      console.warn(
        `[reshare-journal] Intelligent selection returned unknown slug "${parsed.slug}" — falling back to rotation`
      );
      return null;
    }

    console.log(`[reshare-journal] Intelligent selection: ${parsed.slug} — ${parsed.reason}`);

    const strengthRaw = String(parsed.signal_strength || 'none').toLowerCase().trim();
    const signal_strength =
      strengthRaw === 'strong' || strengthRaw === 'notable' ? strengthRaw : 'none';
    const signal_summary =
      signal_strength === 'none' ? '' : String(parsed.signal_summary || '').trim();
    const signal_source_name =
      signal_strength === 'none'
        ? null
        : parsed.signal_source_name
          ? String(parsed.signal_source_name).trim()
          : null;

    return {
      slug: parsed.slug,
      reason: parsed.reason,
      signal_strength,
      signal_summary,
      signal_source_name,
    };
  } catch (err) {
    console.error('[reshare-journal] Intelligent selection failed:', err?.message || err);
    return null;
  }
}

async function generateReshareCaption(slug, title, body, journalUrl, pullQuote, corpusContext) {
  void slug;
  const excerpt = body.length > 3000 ? `${body.slice(0, 3000)}\n...` : body;
  const { relatedWriting = '', topCaptionPatterns = '' } = corpusContext || {};

  const systemPrompt = `You are Auto, Bart Paden's AI CMO. Your job is to write fresh social media captions that reshare one of Bart's existing journal posts to a new audience.

Bart's voice rules — non-negotiable:
- No em dashes. Ever. Rewrite the sentence instead.
- No AI signature phrases: "it's worth noting", "at its core", "furthermore", "moreover", "this highlights", "not only X but also Y", "in many ways", "navigate"
- Short sentences. Direct. No stacked subordinate clauses.
- No hedging. No throat-clearing. No summaries that restate instead of land.
- First person where appropriate. Bart is the author.
- Write as if this is new content, not a repost. Surface a fresh angle, a provocative line from the article, or a question the content answers.
- Never use the words "resharing," "throwback," or "previously" — this must read as fresh content to a new audience, not a repost being flagged as old.

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
${pullQuote ? `\nA pull quote already selected for this reshare's image: "${pullQuote}"\n(You do not need to reuse this line in the captions, but it should feel consistent with whichever caption references the strongest idea in the piece.)\n` : ''}
${relatedWriting}

${topCaptionPatterns}

Article content:
${excerpt}

Write four reshare captions for this article. Surface a fresh angle. Do not summarize the whole piece. Pick one idea, one question, one provocation that makes someone want to read it.`;

  const response = await withRetry(
    () =>
      client.messages.create({
        model: process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    { label: 'generateReshareCaption' }
  );

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

async function resolveScheduleDayIfAutoApprove() {
  let autoApprove = false;
  try {
    const { data: settings } = await supabaseAdmin
      .from('ao_reshare_settings')
      .select('auto_approve')
      .eq('owner_email', 'bart@archetypeoriginal.com')
      .single();
    autoApprove = !!settings?.auto_approve;
  } catch (_) {
    // Default to review mode
  }

  let scheduleDay = null;
  if (!autoApprove) return { autoApprove: false, scheduleDay: null };

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

  return { autoApprove: true, scheduleDay };
}

/**
 * Shared in-process reshare pipeline. Used by HTTP handler and chat trigger.
 * @param {{ forcedSlug?: string|null, forcePendingReview?: boolean }} opts
 */
async function performReshareCycle({ forcedSlug = null, forcePendingReview = false } = {}) {
  let entry;
  let selectionReason = '';
  let signalStrength = 'none';
  let signalSummary = '';
  let signalSourceName = null;
  let opportunityId = null;

  if (forcedSlug) {
    const { data, error } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('*')
      .eq('slug', forcedSlug)
      .eq('paused', false)
      .single();

    if (error || !data) {
      return { ok: false, error: `Slug not found or paused: ${forcedSlug}`, httpStatus: 404 };
    }
    entry = data;
  } else {
    const { data: allEntries, error: allError } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('*')
      .eq('paused', false)
      .order('last_reshared_at', { ascending: true, nullsFirst: true });

    if (allError || !allEntries || allEntries.length === 0) {
      return { ok: true, message: 'No entries available to reshare', httpStatus: 200 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const eligible = allEntries.filter(
      (e) => !e.last_reshared_at || new Date(e.last_reshared_at) < thirtyDaysAgo
    );

    if (eligible.length === 0) {
      return {
        ok: true,
        message: 'All entries were reshared within the past 30 days — nothing to reshare this week',
        httpStatus: 200,
      };
    }

    const intelligentSelection = await selectReshareEntryIntelligently(eligible);

    if (intelligentSelection?.slug) {
      entry = allEntries.find((e) => e.slug === intelligentSelection.slug);
      selectionReason = intelligentSelection.reason;
      signalStrength = intelligentSelection.signal_strength || 'none';
      signalSummary = intelligentSelection.signal_summary || '';
      signalSourceName = intelligentSelection.signal_source_name || null;

      if (signalStrength === 'strong') {
        try {
          const nowIso = new Date().toISOString();
          const { data: oppRow, error: oppError } = await supabaseAdmin
            .from('ao_opportunities')
            .insert({
              title: `${signalSourceName || 'External signal'} connects to your corpus`,
              opportunity_brief: signalSummary || null,
              why_it_matters: selectionReason || null,
              recommended_next_stage: 'publisher',
              ao_lane: 'reshare',
              topic_tags: intelligentSelection.slug
                ? [String(intelligentSelection.slug)]
                : entry?.slug
                  ? [String(entry.slug)]
                  : null,
              source_quote_id: null,
              source_idea_id: null,
              status: 'new',
              created_by_email: 'bart@archetypeoriginal.com',
              created_at: nowIso,
              updated_at: nowIso,
            })
            .select('id')
            .single();

          if (oppError) {
            console.warn(
              '[reshare-journal] Could not log strong signal as opportunity (table may not exist yet — run database/ao_opportunities.sql in Supabase):',
              oppError.message
            );
          } else {
            opportunityId = oppRow?.id || null;
            console.log(
              `[reshare-journal] Logged strong external signal as opportunity: ${signalSourceName || 'unnamed'} (${opportunityId})`
            );
          }
        } catch (oppErr) {
          console.warn(
            '[reshare-journal] Opportunity insert threw (continuing reshare anyway):',
            oppErr?.message || oppErr
          );
        }
      }
    } else {
      console.log('[reshare-journal] Falling back to rotation-based selection');
      entry = eligible[0];
      selectionReason = 'Selected by rotation (oldest last reshared date)';
    }
  }

  if (!entry) {
    return { ok: false, error: 'Could not resolve entry to reshare', httpStatus: 500 };
  }

  const journal = readJournalFile(entry.slug);
  if (!journal) {
    console.error(`[reshare-journal] Journal file not found for slug: ${entry.slug}`);
    await supabaseAdmin.from('ao_reshare_queue').update({ paused: true }).eq('slug', entry.slug);
    return { ok: false, error: `Journal file not found: ${entry.slug}`, httpStatus: 404 };
  }

  const title = entry.title || journal.frontmatter?.title || entry.slug;
  const journalUrl = `https://www.archetypeoriginal.com/journal/${entry.slug}`;

  const [pullQuote, mood, corpusContext] = await Promise.all([
    extractPullQuote(title, journal.body),
    detectArticleMood(title, journal.body),
    getCorpusContext(entry.slug, title),
  ]);

  const generatedImage = await generateReshareImage(title, pullQuote, mood);
  const imageUrl = generatedImage?.image_url || extractJournalImageUrl(journal.frontmatter);

  let captions;
  try {
    captions = await generateReshareCaption(
      entry.slug,
      title,
      journal.body,
      journalUrl,
      pullQuote,
      corpusContext
    );
  } catch (err) {
    console.error('[reshare-journal] Caption generation failed:', err.message);
    return {
      ok: false,
      error: 'Caption generation failed',
      detail: err.message,
      httpStatus: 500,
    };
  }

  const missingChannels = RESHARE_CHANNELS.filter(
    (ch) => !captions[ch.key] || !String(captions[ch.key]).trim()
  );
  if (missingChannels.length > 0) {
    return {
      ok: false,
      error: `Caption generation failed for channels: ${missingChannels.map((c) => c.key).join(', ')}. Reshare aborted. No rows inserted.`,
      httpStatus: 500,
    };
  }

  let autoApprove = false;
  let scheduleDay = null;
  if (!forcePendingReview) {
    const schedule = await resolveScheduleDayIfAutoApprove();
    autoApprove = schedule.autoApprove;
    scheduleDay = schedule.scheduleDay;
  }

  const rows = [];
  const now = new Date().toISOString();

  for (const ch of RESHARE_CHANNELS) {
    const rawCaption = captions[ch.key];
    if (!rawCaption) continue;

    let text = String(rawCaption).trim();
    if (ch.platform === 'instagram') {
      text = normalizeInstagramCaption(text);
    }

    let scheduledAt = now;
    if (autoApprove && scheduleDay) {
      try {
        scheduledAt = await toScheduledAt(scheduleDay, ch.platform);
      } catch (err) {
        console.error(
          `[reshare-journal] toScheduledAt failed for platform "${ch.platform}", falling back to now:`,
          err?.message || err
        );
        scheduledAt = now;
      }
    }

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      image_url: imageUrl || null,
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
        pull_quote: pullQuote || null,
        mood: mood || null,
        photo: generatedImage?.photo || null,
        photo_url: generatedImage?.photo_url || null,
        created_by_email: 'bart@archetypeoriginal.com',
      },
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No captions were generated for any channel', httpStatus: 500 };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(rows)
    .select('id, platform, scheduled_at, status');

  if (insertError) {
    console.error('[reshare-journal] Insert error:', insertError.message);
    return { ok: false, error: insertError.message, httpStatus: 500 };
  }

  const insertedIds = (inserted || []).map((r) => r.id);

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

  return {
    ok: true,
    httpStatus: 200,
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
    mood: mood || null,
    photo: generatedImage?.photo || null,
    photo_url: generatedImage?.photo_url || null,
    image_url: imageUrl || null,
    selection_reason: selectionReason || 'Selected by rotation',
    signal_strength: signalStrength,
    signal_summary: signalSummary || null,
    signal_source_name: signalSourceName,
    opportunity_id: opportunityId,
    message: autoApprove
      ? `${(inserted || []).length} reshare posts scheduled for ${scheduleDay?.toISOString().split('T')[0]}.`
      : `${(inserted || []).length} reshare posts are pending your review in Settings.`,
  };
}

export default async function handler(req, res) {
  try {
    await handleReshareRequest(req, res);
  } catch (err) {
    console.error('[reshare-journal] Unhandled exception in handler:', err?.message || err, err?.stack);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: err?.message || 'Reshare engine failed with an unhandled error',
      });
    }
  }
}

async function handleReshareRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const isCron = isValidCronRequest(req);
  if (!isCron) {
    const auth = requireAoSession(req, res);
    if (!auth) return;
  }

  const forcedSlug = req.body?.slug || req.query?.slug || null;
  const result = await performReshareCycle({ forcedSlug, forcePendingReview: false });
  const status = result.httpStatus || (result.ok ? 200 : 500);
  const { httpStatus: _httpStatus, ...body } = result;
  return res.status(status).json(body);
}

/**
 * In-process reshare for Auto chat. Always pending_review — never auto-schedules from chat.
 * No HTTP self-fetch.
 */
export async function runReshareCycle(forcedSlug = null) {
  try {
    const result = await performReshareCycle({ forcedSlug, forcePendingReview: true });
    const { httpStatus: _httpStatus, ...body } = result;
    return body;
  } catch (err) {
    console.error('[reshare-journal] runReshareCycle unhandled exception:', err?.message || err, err?.stack);
    return { ok: false, error: err?.message || 'Reshare engine failed with an unhandled error' };
  }
}
