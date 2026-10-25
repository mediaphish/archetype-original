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

/**
 * Text and logo on one of Bart's approved backgrounds (lib/ao/reshareBackgrounds.js).
 *
 * Bart, 2026-10-24: "lock Auto out of touching the image themselves. All it
 * can do is add the text in style with the brand. ... The font has weight. The
 * AO logo always in the bottom corner." The photo is drawn exactly as it is,
 * full frame at its own size: no crop, no relighting, no panel over it. The
 * quote goes on the open side (`textSide`), heavy uppercase type with the
 * closing words in brand red, a soft shadow under the letters only so they read
 * on any light, and the logo in the bottom corner on that same side.
 *
 * @param {{ backgroundPath: string, textSide: 'left'|'right', pullQuote: string, attribution?: string }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function composeReshareOnBackground({ backgroundPath, textSide, pullQuote, attribution }) {
  try {
    const quote = String(pullQuote || '').trim();
    if (!quote) return { ok: false, error: 'pullQuote is required' };
    if (textSide !== 'left' && textSide !== 'right') return { ok: false, error: 'textSide must be left or right' };
    ensureFont();
    const photo = await loadImage(backgroundPath);
    if (photo.width !== WIDTH || photo.height !== HEIGHT) {
      // Never resized or cropped to fit: a background of the wrong size is refused.
      return { ok: false, error: `Background must be ${WIDTH}x${HEIGHT}, got ${photo.width}x${photo.height}` };
    }
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(photo, 0, 0);

    const pad = 84;
    const colW = Math.round(WIDTH * 0.44);
    const x = textSide === 'left' ? pad : WIDTH - pad - colW;
    const logoReserve = 150;
    const attrText = String(attribution || '').trim().replace(/^[-–—]\s*/, '');
    const attrLine = attrText ? attrText.toUpperCase() : '';
    const attrH = attrLine ? 22 + 30 : 0;

    const quoteUpper = quote.toUpperCase();
    const fontSize = fitHeavyQuote(ctx, quoteUpper, colW, HEIGHT - logoReserve - 120 - attrH);
    const lineHeight = Math.round(fontSize * 1.06);
    const measured = measureQuoteBlock(ctx, quoteUpper, colW, fontSize, lineHeight);
    // Red reads on a dark wall, not on a bright sunset: there the closing words stay white
    // and carry a red bar under them instead.
    const keyLines = Math.min(2, measured.lines.length);
    const blockH = measured.height + attrH;
    const startY = Math.max(64, 64 + (HEIGHT - logoReserve - 64 - blockH) / 2 - 12);
    // Measured right where the closing words will sit, before any text is drawn.
    const keyTop = startY + (measured.lines.length - keyLines) * lineHeight;
    // Red only where it clearly stands out from what is behind it (contrast of 3 or better).
    const bright = redContrast(regionLuminance(ctx, x, keyTop, colW, keyLines * lineHeight)) < 3;

    // Shadow under the letters only; the photo itself is not dimmed or covered.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.78)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    const afterY = drawHeavyQuote(ctx, measured.lines, measured.keyStartIndex, x, startY, lineHeight, fontSize, bright);
    if (attrLine) {
      ctx.font = `italic bold 24px PlayfairDisplay, Georgia, serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(attrLine, x, afterY + 18);
    }
    ctx.restore();

    const logo = await loadAOMark(LOGO_FILE);
    const markH = 56;
    const markW = markH * (logo.width / logo.height);
    const markX = textSide === 'left' ? pad : WIDTH - pad - markW;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    ctx.drawImage(logo, markX, HEIGHT - markH - 56, markW, markH);
    ctx.restore();

    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    console.error('[composeReshareOnBackground] failed:', err?.message || err);
    return { ok: false, error: err?.message || 'Reshare image failed' };
  }
}

/** Larger than the panel layout allows: up to seven lines, as big as the open side holds. */
function fitHeavyQuote(ctx, quoteUpper, maxWidth, maxHeight) {
  for (let size = 104; size >= 40; size -= 2) {
    const { lines, height } = measureQuoteBlock(ctx, quoteUpper, maxWidth, size, Math.round(size * 1.06));
    if (lines.length && lines.length <= 7 && height <= maxHeight) return size;
  }
  return 40;
}

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Average relative luminance (the contrast-standard kind) where the text will sit. */
function regionLuminance(ctx, x, y, w, h) {
  const data = ctx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).data;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 37) {
    sum += 0.2126 * linear(data[i]) + 0.7152 * linear(data[i + 1]) + 0.0722 * linear(data[i + 2]);
    n += 1;
  }
  return n ? sum / n : 0;
}

/** Contrast between brand red and a background luminance. */
export function redContrast(bgLum) {
  const red = 0.2126 * linear(0xdb) + 0.7152 * linear(0x08) + 0.0722 * linear(0x12);
  const [hi, lo] = red > bgLum ? [red, bgLum] : [bgLum, red];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Heavy type: each word drawn twice, a hair apart, so Inter Bold reads like
 * a black weight. Closing words in brand red, or white with a red bar where the
 * photo behind them is bright.
 */
function drawHeavyQuote(ctx, lines, keyStartIndex, x, startY, lineHeight, fontSize, bright) {
  let wordIndex = 0;
  let y = startY;
  const thicken = Math.max(1, Math.round(fontSize * 0.025));
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean);
    let cx = x;
    for (let i = 0; i < words.length; i += 1) {
      const piece = i === 0 ? words[i] : ` ${words[i]}`;
      const key = wordIndex >= keyStartIndex;
      ctx.fillStyle = key && !bright ? BRAND_RED : '#ffffff';
      ctx.fillText(piece, cx, y);
      ctx.fillText(piece, cx + thicken, y);
      const w = ctx.measureText(piece).width;
      if (key && bright) {
        // One unbroken bar under the closing words on each line.
        const prevKey = i > 0 && wordIndex - 1 >= keyStartIndex;
        const lead = prevKey || i === 0 ? 0 : ctx.measureText(' ').width;
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = BRAND_RED;
        ctx.fillRect(cx + lead, y + fontSize * 0.98, w - lead + thicken, Math.max(4, fontSize * 0.08));
        ctx.restore();
      }
      cx += w;
      wordIndex += 1;
    }
    y += lineHeight;
  }
  return y;
}

// ---------------------------------------------------------------- Bart's reshare style (2026-10-24)

/**
 * The look Bart set with five finished samples on 2026-10-24 ("These are the
 * fonts and colors with the logo. These are what I expect you to produce on
 * top of the images I provided."): heavy condensed capitals in a warm white,
 * the closing words in brand red, set large in a narrow column on the open
 * side, and the stacked Archetype Original lockup (mark over the name) in the
 * bottom corner on that same side. The photo itself is never changed.
 */
const STYLE = {
  cream: '#F3EEE6',
  red: '#DB0812',
  margin: 64,
  column: 0.4,
  lockupWidth: 158,
};

let displayRegistered = false;
function ensureDisplayFont() {
  if (displayRegistered) return;
  const p = join(process.cwd(), 'lib', 'ao', 'fonts', 'BebasNeue-Regular.ttf');
  const fallback = join(process.cwd(), 'public', 'fonts', 'BebasNeue-Regular.ttf');
  GlobalFonts.registerFromPath(existsSync(p) ? p : fallback, 'AOReshareDisplay');
  displayRegistered = true;
}

let lockupCache = null;
/** The stacked lockup, recolored to the warm white. */
async function loadLockup() {
  if (lockupCache) return lockupCache;
  const svgPath = join(process.cwd(), 'public', 'brand', 'archetype-original-lockup.svg');
  // The drawing library ignores the file's style block, so the color goes on each shape.
  const svg = readFileSync(svgPath, 'utf8').replace(/class="st0"/g, `fill="${STYLE.cream}"`).replace(/#231f20/gi, STYLE.cream);
  lockupCache = await loadImage(Buffer.from(svg));
  return lockupCache;
}

/** The closing words in red: about the last third, two to five words. */
export function redWordCount(words) {
  return Math.max(2, Math.min(5, Math.round(words * 0.3)));
}

function displayFont(size) {
  return `${size}px AOReshareDisplay`;
}

function layoutDisplay(ctx, words, width, size) {
  ctx.font = displayFont(size);
  const lines = [];
  let line = [];
  for (const w of words) {
    const test = [...line, w].join(' ');
    if (ctx.measureText(test).width > width && line.length) {
      lines.push(line);
      line = [w];
    } else line.push(w);
  }
  if (line.length) lines.push(line);
  return lines;
}

/**
 * @param {{ backgroundPath: string, textSide: 'left'|'right', pullQuote: string }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function composeReshareInBartStyle({ backgroundPath, textSide, pullQuote }) {
  try {
    const quote = String(pullQuote || '').trim().toUpperCase();
    if (!quote) return { ok: false, error: 'pullQuote is required' };
    if (textSide !== 'left' && textSide !== 'right') return { ok: false, error: 'textSide must be left or right' };
    ensureDisplayFont();
    const photo = await loadImage(backgroundPath);
    if (photo.width !== WIDTH || photo.height !== HEIGHT) {
      return { ok: false, error: `Background must be ${WIDTH}x${HEIGHT}, got ${photo.width}x${photo.height}` };
    }
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(photo, 0, 0);

    const colW = Math.round(WIDTH * STYLE.column);
    const x = textSide === 'left' ? STYLE.margin : WIDTH - STYLE.margin - colW;
    const lockup = await loadLockup();
    const lockH = STYLE.lockupWidth * (lockup.height / lockup.width);
    const lockTop = HEIGHT - STYLE.margin - lockH;
    const textTop = 110;
    const textBottom = lockTop - 70;

    const words = quote.split(/\s+/).filter(Boolean);
    const redFrom = words.length - redWordCount(words.length);
    let size = 130;
    let lines = [];
    for (; size >= 56; size -= 2) {
      lines = layoutDisplay(ctx, words, colW, size);
      if (lines.length <= 9 && lines.length * size * 0.98 <= textBottom - textTop) break;
    }
    const lead = Math.round(size * 0.98);
    const blockH = lines.length * lead;
    const y0 = textTop + Math.max(0, (textBottom - textTop - blockH) / 2) - 20;

    // Bart, 2026-10-24: the red "is not required, but it helps the eyes." So it is
    // always red. On a bright sky, where red alone blurs into the orange, the red
    // words get a deeper shadow under the letters so they hold their edge.
    const redTop = y0 + lines.findIndex((ln, i) => lines.slice(0, i + 1).flat().length > redFrom) * lead;
    const redOnBright = redContrast(regionLuminance(ctx, x, Math.max(0, redTop), colW, Math.max(lead, y0 + blockH - redTop))) < 2.4;

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = displayFont(size);
    // Bart, 2026-10-25: "Is that text blurry?" It was: round joins softened the
    // corners and the soft shadow sat on the letter edges. Corners are now square,
    // the shadow is drawn first as a tight drop beneath, and the letters go on top
    // with no shadow so their edges stay sharp.
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    const placed = [];
    let idx = 0;
    lines.forEach((ln, li) => {
      let cx = x;
      const ly = y0 + li * lead;
      ln.forEach((w, wi) => {
        const piece = wi === 0 ? w : ` ${w}`;
        const isRed = idx >= redFrom;
        placed.push({ piece, cx, ly, color: isRed ? STYLE.red : STYLE.cream, deep: isRed && redOnBright });
        cx += ctx.measureText(piece).width;
        idx += 1;
      });
    });
    // A stroke of the same color gives the condensed face the weight of the samples.
    const weight = Math.max(2, size * 0.05);
    const drawPiece = (p) => {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = weight;
      ctx.strokeText(p.piece, p.cx, p.ly);
      ctx.fillText(p.piece, p.cx, p.ly);
    };
    for (const p of placed) {
      ctx.shadowColor = p.deep ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = p.deep ? 16 : 10;
      ctx.shadowOffsetY = Math.round(size * 0.04);
      drawPiece(p);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    for (const p of placed) drawPiece(p);
    ctx.restore();

    const lx = textSide === 'left' ? STYLE.margin : WIDTH - STYLE.margin - STYLE.lockupWidth;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.drawImage(lockup, lx, lockTop, STYLE.lockupWidth, lockH);
    ctx.restore();

    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    console.error('[composeReshareInBartStyle] failed:', err?.message || err);
    return { ok: false, error: err?.message || 'Reshare image failed' };
  }
}
