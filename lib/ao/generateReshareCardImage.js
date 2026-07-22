/**
 * Reshare social graphic (1536×1024): composite bold uppercase Inter typography +
 * AO logo onto a photo background. Real file fonts only — no model-invented text/logo.
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
/** Left text panel — narrower than before so the subject stays fully visible on the right */
const PANEL_RATIO = 0.42;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_WEBP = Buffer.from('WEBP');

let fontsRegistered = false;

function ensureFont() {
  if (fontsRegistered) return;
  const interPath = join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
  const playfairPath = join(process.cwd(), 'public', 'fonts', 'PlayfairDisplay-BoldItalic.ttf');
  if (existsSync(interPath)) {
    GlobalFonts.registerFromPath(interPath, 'Inter');
  } else {
    console.warn('[generateReshareCardImage] Inter-Bold.ttf not found — quote type may fall back');
  }
  if (existsSync(playfairPath)) {
    GlobalFonts.registerFromPath(playfairPath, 'PlayfairDisplay');
  }
  fontsRegistered = true;
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
    return Buffer.from(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
  }
  if (typeof input === 'string') {
    const dataUrlMatch = input.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
    if (dataUrlMatch) return Buffer.from(dataUrlMatch[1], 'base64');
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

function measureQuoteBlock(ctx, quoteUpper, maxWidth, fontSize, lineHeight) {
  ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
  const { bodyWords, keyWords } = splitKeyPhrase(quoteUpper);
  const allWords = [...bodyWords, ...keyWords];
  if (allWords.length === 0) return { lines: [], height: 0, keyStartIndex: 0 };
  const lines = wrapText(ctx, allWords.join(' '), maxWidth);
  return {
    lines,
    height: lines.length * lineHeight,
    keyStartIndex: bodyWords.length,
  };
}

/**
 * Pick the largest bold Inter size that still fits the quote in the panel text area.
 */
function fitQuoteFontSize(ctx, quoteUpper, maxWidth, maxHeight) {
  let lo = 36;
  let hi = 92;
  let best = lo;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const lineHeight = Math.round(mid * 1.12);
    const { lines, height } = measureQuoteBlock(ctx, quoteUpper, maxWidth, mid, lineHeight);
    const tooManyLines = lines.length > 6;
    if (!tooManyLines && height <= maxHeight && lines.length > 0) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function drawQuoteWithKeyPhrase(ctx, lines, keyStartIndex, x, startY, lineHeight) {
  if (!lines.length) return startY;

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

/**
 * Cover-fit the photo into the visible right region only (not under the text panel),
 * so the subject is never reduced to a sliver behind the panel edge.
 */
function drawCoverInRect(ctx, img, dx, dy, dw, dh) {
  const scale = Math.max(dw / img.width, dh / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  // Center in the visible rect — for typical centered portraits this keeps face/body in frame
  const ox = dx + (dw - drawW) / 2;
  const oy = dy + (dh - drawH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, ox, oy, drawW, drawH);
  ctx.restore();
}

/**
 * @param {{ photoBuffer: Buffer, pullQuote: string, mood?: string, attribution?: string }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function generateReshareCardImage({ photoBuffer, pullQuote, mood, attribution }) {
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

    const panelWidth = Math.round(WIDTH * PANEL_RATIO);
    const photoX = panelWidth;
    const photoW = WIDTH - panelWidth;

    // Charcoal base + photo only in the visible right region (subject never buried under panel)
    ctx.fillStyle = BRAND_CHARCOAL;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawCoverInRect(ctx, photoImg, photoX, 0, photoW, HEIGHT);

    // Solid text panel (full opacity — no photo bleed / ghosting)
    ctx.fillStyle = BRAND_CHARCOAL;
    ctx.fillRect(0, 0, panelWidth, HEIGHT);

    // Soft fade from panel into the photo
    const fadeWidth = 110;
    const fadeGrad = ctx.createLinearGradient(panelWidth, 0, panelWidth + fadeWidth, 0);
    fadeGrad.addColorStop(0, 'rgba(43, 41, 41, 1)');
    fadeGrad.addColorStop(1, 'rgba(43, 41, 41, 0)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(panelWidth, 0, fadeWidth, HEIGHT);

    const paddingX = 56;
    const logoReserve = 140;
    const attrGap = 28;
    const textMaxWidth = panelWidth - paddingX * 2;

    const quoteUpper = quote.toUpperCase();
    const attrText = String(attribution || '')
      .trim()
      .replace(/^[-–—]\s*/, '');
    const attrLine = attrText ? `— ${attrText.toUpperCase()}` : '';
    const attrFontSize = 22;
    const attrHeight = attrLine ? attrFontSize + attrGap : 0;

    const availableTextHeight = HEIGHT - logoReserve - 80 - attrHeight;
    const fontSize = fitQuoteFontSize(ctx, quoteUpper, textMaxWidth, availableTextHeight);
    const lineHeight = Math.round(fontSize * 1.12);
    const measured = measureQuoteBlock(ctx, quoteUpper, textMaxWidth, fontSize, lineHeight);
    const blockHeight = measured.height + attrHeight;

    // Vertically center the quote (+ attribution) above the logo reserve
    const contentTop = 48;
    const contentBottom = HEIGHT - logoReserve;
    let startY = contentTop + Math.max(0, (contentBottom - contentTop - blockHeight) / 2);
    // Slight optical lift
    startY = Math.max(contentTop, startY - 12);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    const afterQuoteY = drawQuoteWithKeyPhrase(
      ctx,
      measured.lines,
      measured.keyStartIndex,
      paddingX,
      startY,
      lineHeight
    );

    if (attrLine) {
      ctx.font = `italic bold ${attrFontSize}px PlayfairDisplay, Georgia, serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(attrLine, paddingX, afterQuoteY + Math.round(attrGap * 0.55));
    }

    try {
      const logo = await loadAOMark(LOGO_FILE);
      const markH = 52;
      const markW = markH * (logo.width / logo.height);
      const markX = paddingX;
      const markY = HEIGHT - markH - 48;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, markX, markY, markW, markH);
      ctx.restore();
    } catch (err) {
      console.error('[generateReshareCardImage] Failed to load AO logo mark:', err?.message || err);
    }

    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    console.error('[generateReshareCardImage] Unexpected error:', err?.message || err);
    return { ok: false, error: err?.message || 'Reshare card generation failed' };
  }
}
