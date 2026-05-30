/**
 * Quote card PNG (1080×1080) + upload to Supabase ao-auto-attachments.
 * Used by /api/ao/auto/generate-card-image and by chat after caption approval
 * (no HTTP loopback).
 *
 * AO mark: public/images/ao-logo-offwhite.png at bottom center, 50% opacity.
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { supabaseAdmin } from '../supabase-admin.js';

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
const THEMES = {
  dark: {
    bgColor: '#0a0a0a',
    textColor: '#ffffff',
    markFile: 'ao-logo-offwhite.png',
    markOpacity: 0.5,
  },
  light: {
    bgColor: '#ffffff',
    textColor: '#0a0a0a',
    markFile: 'ao-logo-black.png',
    markOpacity: 0.5,
  },
};
const FONT_SIZE = 64;
const LINE_HEIGHT = 88;
const MAX_TEXT_WIDTH = 860;
const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

// ── AO Mark ───────────────────────────────────────────────────────────────────
const _aoMarkCache = {};

async function loadAOMark(filename) {
  if (_aoMarkCache[filename]) return _aoMarkCache[filename];
  const { loadImage } = await import('@napi-rs/canvas');
  const pngPath = join(process.cwd(), 'public', 'images', filename);
  const pngBuffer = readFileSync(pngPath);
  _aoMarkCache[filename] = await loadImage(pngBuffer);
  return _aoMarkCache[filename];
}

async function drawAOMark(ctx, canvasWidth, canvasHeight, theme) {
  try {
    const img = await loadAOMark(theme.markFile);
    const markHeight = 80;
    const markWidth = markHeight * (img.width / img.height);
    const x = (canvasWidth - markWidth) / 2;
    const y = canvasHeight - markHeight - 60;
    ctx.save();
    ctx.globalAlpha = theme.markOpacity;
    ctx.drawImage(img, x, y, markWidth, markHeight);
    ctx.restore();
  } catch (err) {
    console.warn('[generateQuoteCardImage] Could not draw AO mark:', err.message);
  }
}

// ── Word wrap ─────────────────────────────────────────────────────────────────
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

// ── Canvas render ─────────────────────────────────────────────────────────────
async function generateCardBuffer(line1, line2, theme = THEMES.dark) {
  ensureFont();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = theme.bgColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = theme.textColor;
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

  await drawAOMark(ctx, WIDTH, HEIGHT, theme);

  return canvas.toBuffer('image/png');
}

/**
 * @param {{ line1: string, line2: string, card_index?: number, batch_id?: string }} opts
 * @returns {Promise<{ ok: boolean, image_url?: string, path?: string, filename?: string, error?: string }>}
 */
export async function generateQuoteCardImage({ line1, line2, card_index, batch_id, theme = 'dark' }) {
  if (!String(line1 || '').trim() || !String(line2 || '').trim()) {
    return {
      ok: false,
      error: 'line1 and line2 are required.',
    };
  }

  try {
    const selectedTheme = THEMES[theme] || THEMES.dark;
    const buffer = await generateCardBuffer(line1.trim(), line2.trim(), selectedTheme);
    const timestamp = Date.now();
    const idx = card_index ? `-${card_index}` : '';
    const batch = batch_id ? `-${batch_id}` : '';
    const themeTag = theme === 'light' ? '-light' : '';
    const filename = `card${idx}${batch}${themeTag}-${timestamp}.png`;
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
