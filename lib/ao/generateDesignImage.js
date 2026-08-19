/**
 * generateDesignImage — gpt-image-1 for styled graphics.
 *
 * Text-only path: POST /v1/images/generations
 * With reference images: POST /v1/images/edits (multipart) — same model family,
 * real visual grounding the way ChatGPT does.
 *
 * Quote cards use generateQuoteCardImage (canvas). Everything else comes here.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { getOpenAiKey } from '../openaiKey.js';

const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'ao-design-images';

/** OpenAI gpt-image-* edits endpoint: up to 16 input images (platform docs). */
export const MAX_REFERENCE_IMAGES = 16;

export const OPENAI_IMAGES_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
export const OPENAI_IMAGES_EDITS_URL = 'https://api.openai.com/v1/images/edits';

// ── Brand context for generic template fallbacks (not explicit prompts) ──
const BRAND_CONTEXT = `
Style: Clean, minimal, authoritative. No stock photo aesthetic. No generic business imagery.
Color palette: Dark backgrounds preferred (#0a0a0a to #2B2929), cream (#E1DED8) or white accents, red (#DB0812) used sparingly.
Typography feel: Strong, direct, serif-influenced.
Mood: Grounded, earned, leadership-forward. Not corporate. Not inspirational poster.
Avoid: Clipart, cartoons, excessive text in image, lens flares, generic office scenes, handshakes, suits.
`.trim();

// gpt-image-1 supports: 1024x1024, 1024x1536, 1536x1024, auto
const API_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
const DEFAULT_SIZE = '1536x1024'; // Landscape — journal headers and social

/** Map legacy dall-e-3 sizes and normalize to gpt-image-1 supported values. */
export function normalizeImageSize(size) {
  const s = String(size || '').trim();
  if (s === '1792x1024') return '1536x1024';
  if (s === '1024x1792') return '1024x1536';
  // 4:3 resurface convention — closest supported landscape canvas
  if (s === '4:3' || s === '4x3' || s === '1536x1152') return '1536x1024';
  if (API_SIZES.includes(s)) return s;
  return DEFAULT_SIZE;
}

function buildPrompt({ prompt, content_type, title }) {
  // BRAND_CONTEXT was previously appended to every explicit prompt Bart approved
  // in chat, even though he never saw or approved that appended text. An explicit,
  // Bart-approved prompt now goes to the model exactly as approved, no silent style
  // injection. BRAND_CONTEXT still applies to the generic template fallbacks below,
  // where no specific prompt was ever approved by Bart.
  if (prompt?.trim()) {
    return prompt.trim();
  }

  const t = String(title || '').trim();

  switch (content_type) {
    case 'journal_header':
      return `A powerful, minimal header image for a leadership journal entry titled "${t}". No text in the image. ${BRAND_CONTEXT}`;

    case 'social_graphic':
      return `A clean, bold social media graphic for a post about "${t}". Atmospheric, minimal, no text. ${BRAND_CONTEXT}`;

    case 'resurface':
      return `Branded resurface graphic for "${t}". Use the provided real photo of Bart as the visual subject. Overlay / compose with the pull quote from the prompt. Compose for a 4:3 social crop on a landscape canvas. Include Archetype Original brand feel. ${BRAND_CONTEXT}`;

    default:
      return `A minimal, authoritative graphic for "${t || 'leadership content'}". ${BRAND_CONTEXT}`;
  }
}

function guessExtFromContentType(ct) {
  const c = String(ct || '').toLowerCase();
  if (c.includes('png')) return 'png';
  if (c.includes('webp')) return 'webp';
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg';
  return 'png';
}

function mimeFromUrlOrType(url, contentType) {
  if (contentType && /^image\//i.test(contentType)) return contentType.split(';')[0].trim();
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  return 'image/png';
}

/**
 * Normalize reference inputs into { buffer, mime, filename }[].
 * Accepts URL strings and/or { buffer|data, mimeType?, filename? } objects.
 */
export async function resolveReferenceImages({
  referenceImageUrls = [],
  referenceImageBuffers = [],
} = {}) {
  const urls = (Array.isArray(referenceImageUrls) ? referenceImageUrls : [])
    .map((u) => String(u || '').trim())
    .filter(Boolean);
  const buffers = Array.isArray(referenceImageBuffers) ? referenceImageBuffers : [];

  const total = urls.length + buffers.length;
  if (total > MAX_REFERENCE_IMAGES) {
    return {
      ok: false,
      error: `Too many reference images (${total}). OpenAI's images/edits endpoint allows at most ${MAX_REFERENCE_IMAGES} for gpt-image-1. Pass fewer references.`,
    };
  }

  const resolved = [];

  for (let i = 0; i < buffers.length; i += 1) {
    const item = buffers[i];
    let buffer = null;
    let mime = 'image/png';
    let filename = `ref-buffer-${i}.png`;
    if (Buffer.isBuffer(item)) {
      buffer = item;
    } else if (item && typeof item === 'object') {
      if (Buffer.isBuffer(item.buffer)) buffer = item.buffer;
      else if (typeof item.data === 'string') buffer = Buffer.from(item.data, 'base64');
      else if (item.data && Buffer.isBuffer(item.data)) buffer = item.data;
      mime = mimeFromUrlOrType('', item.mimeType || item.mediaType || item.contentType);
      filename = item.filename || `ref-buffer-${i}.${guessExtFromContentType(mime)}`;
    }
    if (!buffer || buffer.length < 32) {
      return { ok: false, error: `Reference buffer #${i + 1} is empty or invalid.` };
    }
    resolved.push({ buffer, mime, filename });
  }

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('file:')) {
      return {
        ok: false,
        error: `Reference image URL #${i + 1} must be http(s) or a site-relative /images/... path. Got: ${url.slice(0, 80)}`,
      };
    }
    let fetchUrl = url;
    if (url.startsWith('/')) {
      const siteBase = (process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com').replace(
        /\/$/,
        ''
      );
      fetchUrl = `${siteBase}${url}`;
    }
    let imgRes;
    try {
      imgRes = await fetch(fetchUrl);
    } catch (err) {
      return {
        ok: false,
        error: `Failed to download reference image #${i + 1}: ${err?.message || err}`,
      };
    }
    if (!imgRes.ok) {
      return {
        ok: false,
        error: `Failed to download reference image #${i + 1} (HTTP ${imgRes.status}).`,
      };
    }
    const contentType = imgRes.headers.get('content-type') || '';
    const mime = mimeFromUrlOrType(fetchUrl, contentType);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 32) {
      return { ok: false, error: `Reference image #${i + 1} downloaded empty.` };
    }
    resolved.push({
      buffer,
      mime,
      filename: `ref-url-${i}.${guessExtFromContentType(mime)}`,
    });
  }

  return { ok: true, images: resolved };
}

/**
 * Build multipart body for /v1/images/edits.
 * Exported for tests — asserts image parts are attached.
 */
export function buildImagesEditsFormData({
  prompt,
  size,
  quality = 'high',
  input_fidelity = 'high',
  images,
  model = 'gpt-image-1',
}) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', size);
  form.append('quality', quality);
  // OpenAI-confirmed: input_fidelity controls how strictly gpt-image-1 preserves
  // the reference image's actual details (face, logo, etc.) vs. reinterpreting
  // them. Every images/edits call this codebase makes is grounded on a real
  // reference photo (Bart's likeness), so "high" is the correct default here —
  // not exposing this parameter at all was silently running every edit at
  // OpenAI's lower default fidelity. https://developers.openai.com/api/reference/resources/images/methods/edit
  form.append('input_fidelity', input_fidelity);

  for (const img of images) {
    const blob = new Blob([img.buffer], { type: img.mime || 'image/png' });
    // OpenAI accepts repeated "image" fields for multi-image gpt-image-1 edits.
    form.append('image', blob, img.filename || 'reference.png');
  }

  return form;
}

async function uploadGeneratedPngBuffer(buffer, content_type) {
  const timestamp = Date.now();
  const typeSlug = String(content_type || 'design')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
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
}

async function bufferFromOpenAiImageResponse(openaiData) {
  const b64 = openaiData?.data?.[0]?.b64_json;
  const tempUrl = openaiData?.data?.[0]?.url;

  if (b64) {
    return { ok: true, buffer: Buffer.from(b64, 'base64') };
  }
  if (tempUrl) {
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) {
      return { ok: false, error: `Failed to download generated image: ${imgRes.status}` };
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    return { ok: true, buffer: Buffer.from(arrayBuffer) };
  }
  return { ok: false, error: 'OpenAI did not return an image URL or base64 data.' };
}

/** Test-only fetch override so selftests never hit OpenAI. */
let generateDesignImageFetchOverride = null;
export function __setGenerateDesignImageFetchOverride(fn) {
  generateDesignImageFetchOverride = typeof fn === 'function' ? fn : null;
}

async function openAiFetch(url, options) {
  if (generateDesignImageFetchOverride) {
    return generateDesignImageFetchOverride(url, options);
  }
  return fetch(url, options);
}

/**
 * @param {{
 *   prompt?: string,
 *   content_type?: string,
 *   title?: string,
 *   size?: string,
 *   referenceImageUrls?: string[],
 *   referenceImageBuffers?: Array<Buffer|{buffer?:Buffer,data?:string,mimeType?:string,filename?:string}>,
 * }} opts
 * @returns {Promise<{ ok: boolean, image_url?: string, path?: string, error?: string, endpoint?: string, reference_count?: number }>}
 */
export async function generateDesignImage({
  prompt,
  content_type,
  title,
  size,
  referenceImageUrls,
  referenceImageBuffers,
} = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return { ok: false, error: 'OpenAI API key not configured (OPEN_API_KEY).' };
  }

  const finalPrompt = buildPrompt({ prompt, content_type, title });
  const finalSize = normalizeImageSize(size);

  const resolvedRefs = await resolveReferenceImages({
    referenceImageUrls,
    referenceImageBuffers,
  });
  if (!resolvedRefs.ok) {
    return { ok: false, error: resolvedRefs.error };
  }
  const refs = resolvedRefs.images || [];
  const useEdits = refs.length > 0;

  try {
    let openaiRes;
    let endpoint;

    if (useEdits) {
      endpoint = OPENAI_IMAGES_EDITS_URL;
      const form = buildImagesEditsFormData({
        prompt: finalPrompt,
        size: finalSize,
        images: refs,
      });
      openaiRes = await openAiFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });
    } else {
      endpoint = OPENAI_IMAGES_GENERATIONS_URL;
      openaiRes = await openAiFetch(endpoint, {
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
    }

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => '');
      console.error('[generateDesignImage] OpenAI error:', openaiRes.status, errText);
      return {
        ok: false,
        error: `OpenAI returned ${openaiRes.status}: ${errText.slice(0, 200)}`,
        endpoint,
        reference_count: refs.length,
      };
    }

    const openaiData = await openaiRes.json();
    const buffered = await bufferFromOpenAiImageResponse(openaiData);
    if (!buffered.ok) {
      return { ...buffered, endpoint, reference_count: refs.length };
    }

    const uploaded = await uploadGeneratedPngBuffer(buffered.buffer, content_type);
    if (!uploaded.ok) {
      return { ...uploaded, endpoint, reference_count: refs.length };
    }

    return {
      ...uploaded,
      endpoint,
      reference_count: refs.length,
    };
  } catch (err) {
    console.error('[generateDesignImage]', err?.message || err);
    return { ok: false, error: err?.message || 'Design image generation failed' };
  }
}
