/**
 * Quote card PNG (1080×1080) + upload to Supabase ao-auto-attachments.
 * Used by /api/ao/auto/generate-card-image and by chat after caption approval
 * (no HTTP loopback).
 *
 * Logo: public/brand/ao-logo.svg (or default logo from brand assets), rasterized
 * white at 50% opacity at the bottom — same mark as V1/minimal cards, not drawn circles.
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { supabaseAdmin } from '../supabase-admin.js';
import { getDefaultLogoUrl } from './brandLogos.js';
import { fetchUrlAsDataUrlForSvg } from './remoteAssetDataUrl.js';

// ── Font registration ─────────────────────────────────────────────────────────
let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  const ttfPath = join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
  if (existsSync(ttfPath)) {
    GlobalFonts.registerFromPath(ttfPath, 'Inter');
    fontRegistered = true;
    return;
  }
  const fallbacks = [
    join(process.cwd(), 'public', 'fonts', 'Inter-Bold.otf'),
    join(process.cwd(), 'public', 'fonts', 'inter-bold.ttf'),
  ];
  for (const p of fallbacks) {
    if (existsSync(p)) {
      GlobalFonts.registerFromPath(p, 'Inter');
      fontRegistered = true;
      return;
    }
  }
  console.warn('[generateQuoteCardImage] No font file found at public/fonts/Inter-Bold.ttf — text may not render');
}

const WIDTH = 1080;
const HEIGHT = 1080;
const BG_COLOR = '#0a0a0a';
const TEXT_COLOR = '#ffffff';
const FONT_SIZE = 64;
const LINE_HEIGHT = 88;
const MAX_TEXT_WIDTH = 860;
const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

/** Bottom AO logomark — matches minimal quote card template */
const LOGO_MAX_W = 220;
const LOGO_MAX_H = 96;
const LOGO_BOTTOM_PAD = 80;
const LOGO_OPACITY = 0.5;

let cachedLogoImage = null;
let cachedLogoFailed = false;

function svgToWhiteRasterBuffer(svgText) {
  const white = String(svgText || '')
    .replace(/#231f20/gi, '#ffffff')
    .replace(/\.cls-1\s*\{[^}]*\}/gi, '.cls-1 { fill: #ffffff; }')
    .replace(/fill:\s*#[0-9a-f]{3,8}/gi, 'fill: #ffffff');
  return sharp(Buffer.from(white))
    .resize(512, 512, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function loadLogoFromDisk() {
  const candidates = [
    join(process.cwd(), 'public', 'brand', 'ao-logo.svg'),
    join(process.cwd(), 'public', 'brand', 'ao-icon.svg'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const svg = await readFile(p, 'utf8');
      const pngBuf = await svgToWhiteRasterBuffer(svg);
      return loadImage(pngBuf);
    } catch (e) {
      console.warn('[generateQuoteCardImage] disk logo', p, e?.message || e);
    }
  }
  return null;
}

async function loadLogoImage() {
  if (cachedLogoFailed) return null;
  if (cachedLogoImage) return cachedLogoImage;

  try {
    const remote = await getDefaultLogoUrl({ background: 'dark' });
    if (remote) {
      const dataUrl = await fetchUrlAsDataUrlForSvg(remote);
      if (dataUrl) {
        try {
          cachedLogoImage = await loadImage(dataUrl);
          return cachedLogoImage;
        } catch (_) {
          /* try raw URL */
        }
      }
      try {
        cachedLogoImage = await loadImage(remote);
        return cachedLogoImage;
      } catch (_) {
        /* fall through to disk */
      }
    }

    cachedLogoImage = await loadLogoFromDisk();
    if (!cachedLogoImage) cachedLogoFailed = true;
    return cachedLogoImage;
  } catch (e) {
    console.warn('[generateQuoteCardImage] loadLogoImage', e?.message || e);
    cachedLogoFailed = true;
    return null;
  }
}

function drawImageContainBottom(ctx, img, centerX, bottomY, maxW, maxH) {
  const iw = img.width || 1;
  const ih = img.height || 1;
  const scale = Math.min(maxW / iw, maxH / ih, 1);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  const lx = Math.round(centerX - dw / 2);
  const ly = Math.round(bottomY - dh);
  ctx.drawImage(img, lx, ly, dw, dh);
}

async function drawAoLogo(ctx) {
  const img = await loadLogoImage();
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = LOGO_OPACITY;
  drawImageContainBottom(ctx, img, WIDTH / 2, HEIGHT - LOGO_BOTTOM_PAD, LOGO_MAX_W, LOGO_MAX_H);
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const { width } = ctx.measureText(test);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateCardBuffer(line1, line2) {
  ensureFont();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${FONT_SIZE}px Inter, Arial, sans-serif`;

  const lines1 = wrapText(ctx, line1, MAX_TEXT_WIDTH);
  const lines2 = wrapText(ctx, line2, MAX_TEXT_WIDTH);
  const allLineCount = lines1.length + lines2.length;
  const textBlockHeight = allLineCount * LINE_HEIGHT;
  const textAreaCenter = HEIGHT * 0.42;
  const startY = textAreaCenter - textBlockHeight / 2 + LINE_HEIGHT / 2;

  lines1.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * LINE_HEIGHT);
  });

  const line2StartY = startY + lines1.length * LINE_HEIGHT + LINE_HEIGHT * 0.4;
  lines2.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, line2StartY + i * LINE_HEIGHT);
  });

  await drawAoLogo(ctx);

  return canvas.toBuffer('image/png');
}

/**
 * @param {{ line1: string, line2: string, card_index?: number, batch_id?: string }} opts
 * @returns {Promise<{ ok: boolean, image_url?: string, path?: string, filename?: string, error?: string }>}
 */
export async function generateQuoteCardImage({ line1, line2, card_index, batch_id }) {
  if (!String(line1 || '').trim() || !String(line2 || '').trim()) {
    return {
      ok: false,
      error: 'line1 and line2 are required.',
    };
  }

  try {
    const buffer = await generateCardBuffer(line1.trim(), line2.trim());
    const timestamp = Date.now();
    const idx = card_index ? `-${card_index}` : '';
    const batch = batch_id ? `-${batch_id}` : '';
    const filename = `card${idx}${batch}-${timestamp}.png`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[generateQuoteCardImage] Upload error:', uploadError.message);
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) {
      return { ok: false, error: 'Image uploaded but could not retrieve public URL.' };
    }

    return { ok: true, image_url: imageUrl, path: storagePath, filename };
  } catch (err) {
    console.error('[generateQuoteCardImage]', err?.message || err);
    return { ok: false, error: err?.message || 'Image generation failed' };
  }
}
