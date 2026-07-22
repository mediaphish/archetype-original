/**
 * Reshare social graphic (1536×1024): composite real pull-quote typography + AO logo
 * onto a DALL-E-edited photo background. Mirrors the quote-card pattern in
 * generateQuoteCardImage.js — no model-invented text or logo.
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFileSync, existsSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const WIDTH = 1536;
const HEIGHT = 1024;
const BRAND_CHARCOAL = '#2B2929';
const BRAND_RED = '#DB0812';
const LOGO_FILE = 'ao-logo-offwhite.png';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_WEBP = Buffer.from('WEBP');

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  const ttfPath = join(process.cwd(), 'public', 'fonts', 'PlayfairDisplay-BoldItalic.ttf');
  if (existsSync(ttfPath)) {
    GlobalFonts.registerFromPath(ttfPath, 'PlayfairDisplay');
    fontRegistered = true;
    return;
  }
  console.warn('[generateReshareCardImage] PlayfairDisplay-BoldItalic.ttf not found — text may not render');
}

const _aoMarkCache = {};

/**
 * Normalize unknown binary input into a standalone Node Buffer (own memory, byteOffset 0).
 * Always copies — never returns a subarray/view. @napi-rs/canvas loadImage can mis-sniff
 * format on non-zero-offset Buffer views and throw "Invalid SVG image" on valid PNGs.
 */
export function toNodeBuffer(input) {
  if (!input) return null;
  if (Buffer.isBuffer(input)) return Buffer.from(input);
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
  if (ArrayBuffer.isView(input)) {
    // Copy the view's bytes only — do NOT Buffer.from(ab, offset, len) (shared memory).
    return Buffer.from(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
  }
  if (typeof input === 'string') {
    // data URL or raw base64
    const dataUrlMatch = input.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
    if (dataUrlMatch) return Buffer.from(dataUrlMatch[1], 'base64');
    // Heuristic: long base64 without path separators
    if (input.length > 100 && !input.includes('/') && !input.includes('\\')) {
      return Buffer.from(input, 'base64');
    }
    return null;
  }
  return null;
}

export function describeImageMagic(buf) {
  if (!buf || !buf.length) return 'empty';
  const head = buf.subarray(0, 12);
  const hex = Buffer.from(head).toString('hex');
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) return `png (${hex})`;
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG_MAGIC)) return `jpeg (${hex})`;
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(WEBP_RIFF) &&
    buf.subarray(8, 12).equals(WEBP_WEBP)
  ) {
    return `webp (${hex})`;
  }
  if (buf.subarray(0, 5).toString('utf8') === '<?xml' || buf.subarray(0, 4).toString('utf8') === '<svg') {
    return `svg-or-xml (${hex})`;
  }
  return `unknown (${hex})`;
}

export function isDecodableRasterBuffer(buf) {
  if (!buf || buf.length < 3) return false;
  if (buf.subarray(0, 8).equals(PNG_MAGIC)) return true;
  if (buf.subarray(0, 3).equals(JPEG_MAGIC)) return true;
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(WEBP_RIFF) &&
    buf.subarray(8, 12).equals(WEBP_WEBP)
  ) {
    return true;
  }
  return false;
}

/**
 * Load a raster image for compositing. Prefer a clean in-memory Buffer; if
 * @napi-rs/canvas still mis-sniffs (e.g. "Invalid SVG image" on a valid PNG),
 * fall back to a temp file path — the same reliability pattern as path-based logo load.
 */
async function loadRasterImage(buffer, label = 'image') {
  const clean = Buffer.isBuffer(buffer) ? Buffer.from(buffer) : Buffer.from(new Uint8Array(buffer));
  try {
    return await loadImage(clean);
  } catch (err) {
    console.error(
      `[generateReshareCardImage] Failed to load ${label} buffer (after clean copy):`,
      err?.message,
      '— trying temp file path'
    );
    const ext = clean.subarray(0, 3).equals(JPEG_MAGIC) ? 'jpg' : 'png';
    const tempPath = join(tmpdir(), `reshare-${label}-${randomUUID()}.${ext}`);
    try {
      await writeFile(tempPath, clean);
      return await loadImage(tempPath);
    } catch (err2) {
      console.error(`[generateReshareCardImage] Failed to load ${label} via temp file:`, err2?.message);
      throw err2;
    } finally {
      try {
        await unlink(tempPath);
      } catch (_) {
        /* best effort cleanup */
      }
    }
  }
}

async function loadAOMark(filename) {
  if (_aoMarkCache[filename]) return _aoMarkCache[filename];
  const pngPath = join(process.cwd(), 'public', 'images', filename);
  if (!existsSync(pngPath)) {
    throw new Error(`AO logo file missing on disk: ${pngPath}`);
  }
  if (filename.toLowerCase().endsWith('.svg')) {
    throw new Error(`AO logo must be PNG, not SVG: ${filename}`);
  }
  const pngBuffer = Buffer.from(readFileSync(pngPath));
  const magic = describeImageMagic(pngBuffer);
  if (!isDecodableRasterBuffer(pngBuffer)) {
    throw new Error(`AO logo file is not a valid PNG/JPEG/WEBP (magic=${magic}): ${pngPath}`);
  }
  try {
    _aoMarkCache[filename] = await loadRasterImage(pngBuffer, 'ao-logo');
  } catch (err) {
    try {
      _aoMarkCache[filename] = await loadImage(pngPath);
    } catch (err2) {
      throw new Error(
        `loadImage failed for AO logo buffer (${err?.message}) and path (${err2?.message}); magic=${magic}`
      );
    }
  }
  return _aoMarkCache[filename];
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
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

/**
 * Split quote into body (white) + trailing key phrase (brand red).
 * Last 2–4 words become the red segment depending on quote length.
 */
function splitKeyPhrase(quote) {
  const words = String(quote || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return { bodyWords: [], keyWords: words };
  }
  const keyCount = words.length <= 6 ? 2 : words.length <= 12 ? 3 : 4;
  const keyWords = words.slice(-keyCount);
  const bodyWords = words.slice(0, -keyCount);
  return { bodyWords, keyWords };
}

/**
 * Draw wrapped lines word-by-word so the trailing key phrase stays brand red
 * even when wrapping splits it across lines.
 */
function drawQuoteWithKeyPhrase(ctx, quote, x, maxWidth, startY, lineHeight) {
  const { bodyWords, keyWords } = splitKeyPhrase(quote);
  const allWords = [...bodyWords, ...keyWords];
  if (allWords.length === 0) return startY;

  const keyStartIndex = bodyWords.length;
  const lines = wrapText(ctx, allWords.join(' '), maxWidth);
  if (lines.length === 0) return startY;

  let wordIndex = 0;
  let y = startY;

  for (const line of lines) {
    const lineWords = line.split(/\s+/).filter(Boolean);
    let cursorX = x;
    for (let i = 0; i < lineWords.length; i++) {
      const word = lineWords[i];
      const piece = i === 0 ? word : ` ${word}`;
      ctx.fillStyle = wordIndex >= keyStartIndex ? BRAND_RED : '#ffffff';
      ctx.fillText(piece, cursorX, y);
      cursorX += ctx.measureText(piece).width;
      wordIndex += 1;
    }
    y += lineHeight;
  }
  return y;
}

function drawCoverImage(ctx, img, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

/**
 * @param {{ photoBuffer: Buffer, pullQuote: string, mood?: string }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function generateReshareCardImage({ photoBuffer, pullQuote, mood }) {
  void mood;
  try {
    const quote = String(pullQuote || '').trim();
    if (!quote) {
      return { ok: false, error: 'pullQuote is required' };
    }

    const normalized = toNodeBuffer(photoBuffer);
    if (!normalized) {
      return {
        ok: false,
        error: `Photo buffer failed to load: not a Buffer/Uint8Array (got ${typeof photoBuffer})`,
      };
    }

    if (!isDecodableRasterBuffer(normalized)) {
      console.error(
        '[generateReshareCardImage] Photo is not PNG/JPEG/WEBP — length:',
        normalized.length,
        'magic:',
        describeImageMagic(normalized)
      );
      return {
        ok: false,
        error: `Photo buffer failed to load: expected PNG/JPEG/WEBP magic bytes, got ${describeImageMagic(normalized)}`,
      };
    }

    ensureFont();

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    let photoImg;
    try {
      photoImg = await loadRasterImage(normalized, 'photo');
    } catch (err) {
      return { ok: false, error: `Photo buffer failed to load: ${err?.message}` };
    }

    drawCoverImage(ctx, photoImg, WIDTH, HEIGHT);

    // Semi-transparent charcoal panel on the left so white text stays readable
    const panelWidth = Math.round(WIDTH * 0.52);
    ctx.fillStyle = BRAND_CHARCOAL;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, panelWidth, HEIGHT);
    ctx.globalAlpha = 1;

    // Soft fade at the panel edge into the photo
    const fadeWidth = 120;
    const fadeGrad = ctx.createLinearGradient(panelWidth - fadeWidth, 0, panelWidth + fadeWidth * 0.4, 0);
    fadeGrad.addColorStop(0, 'rgba(43, 41, 41, 1)');
    fadeGrad.addColorStop(1, 'rgba(43, 41, 41, 0)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(panelWidth - fadeWidth, 0, fadeWidth + Math.round(fadeWidth * 0.4), HEIGHT);

    const paddingX = 72;
    const paddingTop = 100;
    const textMaxWidth = panelWidth - paddingX * 2 - 20;
    const fontSize = quote.length > 120 ? 42 : quote.length > 80 ? 48 : 56;
    const lineHeight = Math.round(fontSize * 1.35);

    ctx.font = `italic bold ${fontSize}px PlayfairDisplay, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    drawQuoteWithKeyPhrase(ctx, quote, paddingX, textMaxWidth, paddingTop, lineHeight);

    try {
      const logo = await loadAOMark(LOGO_FILE);
      const markH = 56;
      const markW = markH * (logo.width / logo.height);
      const markX = paddingX;
      const markY = HEIGHT - markH - 56;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(logo, markX, markY, markW, markH);
      ctx.restore();
    } catch (err) {
      // Logo failure must not kill the whole card — log specifically and continue.
      console.error('[generateReshareCardImage] Failed to load AO logo mark:', err?.message || err);
    }

    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    console.error('[generateReshareCardImage] Unexpected error:', err?.message || err);
    return { ok: false, error: err?.message || 'Reshare card generation failed' };
  }
}
