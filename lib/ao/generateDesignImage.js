/**
 * generateDesignImage — DALL-E 3 image generation for styled graphics.
 *
 * Used for journal entry headers, social post graphics, and any content
 * requiring actual design rather than a templated quote card.
 *
 * Quote cards use generateQuoteCardImage (canvas-based, consistent template).
 * Everything else comes here.
 *
 * Drop this file in: /lib/ao/generateDesignImage.js
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { getOpenAiKey } from '../openaiKey.js';

const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'ao-design-images';

// ── Brand context injected into every DALL-E prompt ───────────────────────────
// Keeps all generated images consistent with AO aesthetic.
const BRAND_CONTEXT = `
Style: Clean, minimal, authoritative. No stock photo aesthetic. No generic business imagery.
Color palette: Dark backgrounds preferred (#0a0a0a to #2B2929), cream (#E1DED8) or white accents, red (#DB0812) used sparingly.
Typography feel: Strong, direct, serif-influenced.
Mood: Grounded, earned, leadership-forward. Not corporate. Not inspirational poster.
Avoid: Clipart, cartoons, excessive text in image, lens flares, generic office scenes, handshakes, suits.
`.trim();

// gpt-image-1 supports: 1024x1024, 1024x1536, 1536x1024, auto
const API_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
const DEFAULT_SIZE = '1536x1024'; // Landscape 16:9 — journal headers and social

/** Map legacy dall-e-3 sizes and normalize to gpt-image-1 supported values. */
function normalizeImageSize(size) {
  const s = String(size || '').trim();
  if (s === '1792x1024') return '1536x1024';
  if (s === '1024x1792') return '1024x1536';
  if (API_SIZES.includes(s)) return s;
  return DEFAULT_SIZE;
}

// ── Prompt builders by content type ──────────────────────────────────────────
function buildPrompt({ prompt, content_type, title }) {
  if (prompt?.trim()) {
    // User or Auto provided a full prompt — use it with brand context appended
    return `${prompt.trim()}\n\n${BRAND_CONTEXT}`;
  }

  const t = String(title || '').trim();

  switch (content_type) {
    case 'journal_header':
      return `A powerful, minimal header image for a leadership journal entry titled "${t}". No text in the image. ${BRAND_CONTEXT}`;

    case 'social_graphic':
      return `A clean, bold social media graphic for a post about "${t}". Atmospheric, minimal, no text. ${BRAND_CONTEXT}`;

    default:
      return `A minimal, authoritative graphic for "${t || 'leadership content'}". ${BRAND_CONTEXT}`;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * @param {{ prompt?: string, content_type?: string, title?: string, size?: string }} opts
 * @returns {Promise<{ ok: boolean, image_url?: string, path?: string, error?: string }>}
 */
export async function generateDesignImage({ prompt, content_type, title, size } = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return { ok: false, error: 'OpenAI API key not configured (OPEN_API_KEY).' };
  }

  const finalPrompt = buildPrompt({ prompt, content_type, title });
  const finalSize = normalizeImageSize(size);

  try {
    // Call DALL-E 3
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: finalPrompt,
        n: 1,
        size: finalSize,
        quality: 'high',
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => '');
      console.error('[generateDesignImage] OpenAI error:', openaiRes.status, errText);
      return { ok: false, error: `OpenAI returned ${openaiRes.status}: ${errText.slice(0, 200)}` };
    }

    const openaiData = await openaiRes.json();
    // gpt-image-1 returns base64 by default, not a URL
    const b64 = openaiData?.data?.[0]?.b64_json;
    const tempUrl = openaiData?.data?.[0]?.url;

    let buffer;

    if (b64) {
      buffer = Buffer.from(b64, 'base64');
    } else if (tempUrl) {
      const imgRes = await fetch(tempUrl);
      if (!imgRes.ok) {
        return { ok: false, error: `Failed to download generated image: ${imgRes.status}` };
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return { ok: false, error: 'OpenAI did not return an image URL or base64 data.' };
    }

    // Upload to Supabase storage
    const timestamp = Date.now();
    const typeSlug = String(content_type || 'design').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${typeSlug}-${timestamp}.png`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[generateDesignImage] Upload error:', uploadError.message);
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData?.publicUrl;

    if (!imageUrl) {
      return { ok: false, error: 'Image uploaded but could not retrieve public URL.' };
    }

    return { ok: true, image_url: imageUrl, path: storagePath, filename };

  } catch (err) {
    console.error('[generateDesignImage]', err?.message || err);
    return { ok: false, error: err?.message || 'Design image generation failed' };
  }
}
