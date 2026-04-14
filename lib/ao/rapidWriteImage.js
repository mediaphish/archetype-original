/**
 * Rapid Write hero images — OpenAI Images API (DALL·E 3), resize to 16:9 ~1024w, durable Supabase URL.
 */

import sharp from 'sharp';
import { getOpenAiKey } from '../openaiKey.js';
import { uploadQuoteCardPngBuffer } from './quoteCardImageUrl.js';

export const RAPID_WRITE_IMAGE_TARGET_WIDTH = 1024;
export const RAPID_WRITE_IMAGE_TARGET_HEIGHT = 576;

/** Fixed guardrails (plan): no readable text in frame; workplace people; 16:9 delivery. */
export const RAPID_WRITE_IMAGE_GUARDRAILS = `You are generating a single landscape illustration for a leadership journal article.

Hard rules:
- The image must contain NO text, letters, words, logos, signs, screens with readable UI, watermarks, or captions.
- Show believable adults in workplace settings when the article implies meetings, offices, or hard conversations: small groups, one-on-one, moments of clarity or tension. Avoid abstract-only unless the article is strongly abstract; default to human figures in context.
- Cinematic, professional tone; natural lighting; no caricature; no celebrity likenesses.
- Output must work as a wide 16:9 hero (landscape).`;

/**
 * Strip minimal markdown/noise for image prompt source text.
 * @param {string} md
 */
export function stripMarkdownToPlain(md) {
  let s = String(md || '');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/!\[[^\]]*]\([^)]+\)/g, ' ');
  s = s.replace(/\[([^\]]+)]\([^)]+\)/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * @param {string} postPlainText
 * @returns {string}
 */
export function buildRapidWriteImagePrompt(postPlainText) {
  const body = stripMarkdownToPlain(postPlainText).slice(0, 3500);
  return `${RAPID_WRITE_IMAGE_GUARDRAILS}

Derive setting, mood, and composition from the article below. Do not depict quotes, titles, or on-image typography.

Article text (for scene selection only):
---
${body}
---`;
}

/**
 * Chat step refines a safe visual description (still no text in image). **On by default.**
 * Set `AO_RAPID_WRITE_IMAGE_CHAT_STEP` to `0`, `false`, `off`, or `no` to skip and send the raw built prompt to the image API.
 */
async function refinePromptWithChat(fullPrompt) {
  const chatStepOff = /^0|false|off|no$/i.test(String(process.env.AO_RAPID_WRITE_IMAGE_CHAT_STEP ?? '').trim());
  if (chatStepOff) return fullPrompt;
  const apiKey = getOpenAiKey();
  if (!apiKey) return fullPrompt;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AO_RAPID_WRITE_IMAGE_REFINE_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Reply with one paragraph only: a concrete DALL·E scene description. No text or lettering in the scene. Workplace leadership imagery. English.',
        },
        {
          role: 'user',
          content: `Turn this into a single vivid scene description paragraph for an image generator (no text in the image):\n\n${fullPrompt.slice(0, 6000)}`,
        },
      ],
    }),
  });
  if (!res.ok) return fullPrompt;
  const json = await res.json().catch(() => ({}));
  const para = json.choices?.[0]?.message?.content?.trim() || '';
  if (!para) return fullPrompt;
  return `${RAPID_WRITE_IMAGE_GUARDRAILS}\n\nScene:\n${para.slice(0, 3500)}`;
}

/**
 * @param {{ full_markdown?: string|null, tldr_markdown?: string|null, topic?: string|null }} row
 */
export function getPostPlainTextFromDraftRow(row) {
  const full = String(row?.full_markdown || '').trim();
  const tldr = String(row?.tldr_markdown || '').trim();
  const topic = String(row?.topic || '').trim();
  const raw = full || tldr || topic;
  return stripMarkdownToPlain(raw);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} draftId
 * @param {string} email
 */
export async function loadCorpusDraftForOwner(supabaseAdmin, draftId, email) {
  const { data, error } = await supabaseAdmin
    .from('ao_corpus_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('created_by_email', email)
    .maybeSingle();
  if (error) return { ok: false, error: error.message, draft: null };
  if (!data) return { ok: false, error: 'Draft not found', draft: null };
  return { ok: true, draft: data, error: '' };
}

/**
 * Download URL → resize cover 1024×576 PNG.
 * @param {string} imageUrl
 */
async function downloadResizeToHeroPng(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Could not download generated image');
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf)
    .resize(RAPID_WRITE_IMAGE_TARGET_WIDTH, RAPID_WRITE_IMAGE_TARGET_HEIGHT, {
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .png()
    .toBuffer();
}

/**
 * @param {string} prompt
 */
async function callOpenAiImagesGenerations(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'AI key not configured for image generation.', url: null };
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: '1792x1024',
      quality: 'standard',
      response_format: 'url',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error?.message || json.message || `HTTP ${res.status}`;
    return { ok: false, error: err, url: null };
  }
  const url = json.data?.[0]?.url || null;
  if (!url) return { ok: false, error: 'No image URL in response', url: null };
  return { ok: true, error: '', url };
}

/**
 * Generate hero image, upload, merge meta.rapid_write_image (status pending).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} draftId
 * @param {string} email
 * @param {{ force?: boolean }} [opts]
 */
export async function generateRapidWriteHeroForDraft(supabaseAdmin, draftId, email, opts = {}) {
  const loaded = await loadCorpusDraftForOwner(supabaseAdmin, draftId, email);
  if (!loaded.ok || !loaded.draft) return { ok: false, error: loaded.error || 'Draft not found', draft: null };

  const row = loaded.draft;
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const existing = meta.rapid_write_image && typeof meta.rapid_write_image === 'object' ? meta.rapid_write_image : null;
  if (existing?.status === 'approved' && !opts.force) {
    return {
      ok: false,
      error: 'Hero image already approved. Say regenerate hero image for this seed, or use force from the API.',
      draft: row,
    };
  }

  const plain = getPostPlainTextFromDraftRow(row);
  if (!plain || plain.length < 40) {
    return { ok: false, error: 'Draft needs more text before generating a hero image.', draft: row };
  }

  let prompt = buildRapidWriteImagePrompt(plain);
  prompt = await refinePromptWithChat(prompt);

  const gen = await callOpenAiImagesGenerations(prompt);
  if (!gen.ok) return { ok: false, error: gen.error || 'Image generation failed', draft: row };

  let pngBuffer;
  try {
    pngBuffer = await downloadResizeToHeroPng(gen.url);
  } catch (e) {
    return { ok: false, error: e.message || 'Resize failed', draft: row };
  }

  const up = await uploadQuoteCardPngBuffer(pngBuffer, { subfolder: 'rapid-write-heroes' });
  if (!up.ok) return { ok: false, error: up.error || 'Upload failed', draft: row };

  const prevCount = typeof existing?.regenerate_count === 'number' ? existing.regenerate_count : 0;
  const rapid_write_image = {
    url: up.publicUrl,
    status: 'pending',
    prompt_used: prompt.slice(0, 8000),
    created_at: new Date().toISOString(),
    model: 'dall-e-3',
    width: RAPID_WRITE_IMAGE_TARGET_WIDTH,
    height: RAPID_WRITE_IMAGE_TARGET_HEIGHT,
    regenerate_count: opts.force ? prevCount + 1 : prevCount,
  };

  const nextMeta = { ...meta, rapid_write_image };
  const { data: updated, error: upErr } = await supabaseAdmin
    .from('ao_corpus_drafts')
    .update({
      meta: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('created_by_email', email)
    .select('*')
    .single();

  if (upErr) return { ok: false, error: upErr.message || 'Could not save image metadata', draft: row };
  return { ok: true, error: '', draft: updated || { ...row, meta: nextMeta } };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} draftId
 * @param {string} email
 * @param {'approved'|'rejected'} status
 */
export async function setRapidWriteHeroStatus(supabaseAdmin, draftId, email, status) {
  const loaded = await loadCorpusDraftForOwner(supabaseAdmin, draftId, email);
  if (!loaded.ok || !loaded.draft) return { ok: false, error: loaded.error || 'Draft not found', draft: null };
  const row = loaded.draft;
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const img = meta.rapid_write_image && typeof meta.rapid_write_image === 'object' ? meta.rapid_write_image : null;
  if (!img?.url) return { ok: false, error: 'No hero image to approve or reject yet.', draft: row };

  const now = new Date().toISOString();
  const rapid_write_image = {
    ...img,
    status,
    ...(status === 'approved' ? { approved_at: now } : { rejected_at: now }),
  };
  const nextMeta = { ...meta, rapid_write_image };
  const { data: updated, error } = await supabaseAdmin
    .from('ao_corpus_drafts')
    .update({ meta: nextMeta, updated_at: now })
    .eq('id', draftId)
    .eq('created_by_email', email)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message, draft: row };
  return { ok: true, error: '', draft: updated || { ...row, meta: nextMeta } };
}
