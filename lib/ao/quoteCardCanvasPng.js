/**
 * Minimal AO quote card → PNG via Skia (@napi-rs/canvas) + bundled TTF.
 * Avoids librsvg/system-font gaps on serverless.
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = join(__dirname, 'fonts', 'Inter-latin-700-normal.ttf');
const FONT_FAMILY = 'AOQuoteInter';

const W = 1080;
const H = 1080;
const PAD = 72;
const MUTED = 'rgba(245,245,245,0.72)';

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  try {
    GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
    fontRegistered = true;
  } catch (e) {
    throw new Error(`Quote card font load failed: ${e?.message || e}`);
  }
}

function wrapParagraphToLines(ctx, paragraph, maxWidth, maxLines, existing) {
  const words = String(paragraph || '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  let line = '';
  const out = [...existing];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = word;
      if (out.length >= maxLines) return out;
    } else {
      line = test;
    }
  }
  if (line && out.length < maxLines) out.push(line);
  return out;
}

function wrapQuoteToLines(ctx, quote, maxWidth, maxLines, fontSize) {
  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}, sans-serif`;
  const blocks = String(quote || '')
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  const lines = [];
  for (const block of blocks) {
    if (lines.length >= maxLines) break;
    const chunk = wrapParagraphToLines(ctx, block, maxWidth, maxLines - lines.length, []);
    for (const ln of chunk) {
      lines.push(ln);
      if (lines.length >= maxLines) return lines;
    }
  }
  return lines;
}

function wrapSourceLines(ctx, sourceName, maxWidth, maxLines, fontSize) {
  ctx.font = `600 ${fontSize}px ${FONT_FAMILY}, sans-serif`;
  return wrapParagraphToLines(ctx, sourceName, maxWidth, maxLines, []);
}

/**
 * @param {{ quote?: string, sourceName?: string, logoUrl?: string | null }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function renderMinimalQuoteCardPngBuffer({ quote, sourceName, logoUrl } = {}) {
  const q = String(quote || '').trim();
  if (!q) return { ok: false, error: 'quote required' };

  try {
    ensureFont();
  } catch (e) {
    return { ok: false, error: e?.message || 'Font registration failed' };
  }

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  const maxTextWidth = W - PAD * 2;
  const maxQuoteLines = 14;
  let fontSize = 46;
  let lines = wrapQuoteToLines(ctx, q, maxTextWidth, maxQuoteLines, fontSize);
  while (lines.length > 10 && fontSize > 28) {
    fontSize -= 2;
    lines = wrapQuoteToLines(ctx, q, maxTextWidth, maxQuoteLines, fontSize);
  }

  const lineHeight = Math.round(fontSize * 1.28);
  const totalTextHeight = lines.length * lineHeight;
  const reservedBottom = String(sourceName || '').trim() ? 200 : 160;
  let yStart = Math.round((H - totalTextHeight - reservedBottom) / 2);
  yStart = Math.max(PAD, Math.min(yStart, 380));

  ctx.fillStyle = '#f5f5f5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}, sans-serif`;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, yStart + i * lineHeight);
  });

  const src = String(sourceName || '').trim();
  let logoY = H - PAD - 96;
  if (src) {
    const srcLines = wrapSourceLines(ctx, src, maxTextWidth, 2, 26);
    ctx.font = `600 26px ${FONT_FAMILY}, sans-serif`;
    ctx.fillStyle = MUTED;
    const srcStartY = Math.min(yStart + totalTextHeight + 40, H - PAD - 96 - srcLines.length * 34 - 8);
    srcLines.forEach((sl, j) => {
      ctx.fillText(sl, W / 2, srcStartY + j * 34);
    });
    logoY = Math.max(srcStartY + srcLines.length * 34 + 16, H - PAD - 110);
  }

  if (logoUrl) {
    try {
      const img = await loadImage(String(logoUrl));
      const lw = 220;
      const lh = 96;
      const lx = (W - lw) / 2;
      ctx.drawImage(img, lx, logoY, lw, lh);
    } catch (_) {
      ctx.font = `700 44px ${FONT_FAMILY}, sans-serif`;
      ctx.fillStyle = '#f5f5f5';
      ctx.textAlign = 'center';
      ctx.fillText('AO', W / 2, logoY + 24);
    }
  } else {
    ctx.font = `700 44px ${FONT_FAMILY}, sans-serif`;
    ctx.fillStyle = '#f5f5f5';
    ctx.textAlign = 'center';
    ctx.fillText('AO', W / 2, logoY + 24);
  }

  try {
    const buffer = await canvas.encode('png');
    if (!buffer?.length) return { ok: false, error: 'Empty PNG buffer' };
    return { ok: true, buffer };
  } catch (e) {
    return { ok: false, error: e?.message || 'encode failed' };
  }
}

export const QUOTE_CARD_CANVAS_SIZE = W;
