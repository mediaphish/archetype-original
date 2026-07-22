/**
 * Reshare social graphic (1536×1024): composite real pull-quote typography + AO logo
 * onto a DALL-E-edited photo background. Mirrors the quote-card pattern in
 * generateQuoteCardImage.js — no model-invented text or logo.
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WIDTH = 1536;
const HEIGHT = 1024;
const BRAND_CHARCOAL = '#2B2929';
const BRAND_RED = '#DB0812';
const LOGO_FILE = 'ao-logo-offwhite.png';

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

async function loadAOMark(filename) {
  if (_aoMarkCache[filename]) return _aoMarkCache[filename];
  const pngPath = join(process.cwd(), 'public', 'images', filename);
  const pngBuffer = readFileSync(pngPath);
  _aoMarkCache[filename] = await loadImage(pngBuffer);
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
    if (!photoBuffer) {
      return { ok: false, error: 'photoBuffer is required' };
    }
    const quote = String(pullQuote || '').trim();
    if (!quote) {
      return { ok: false, error: 'pullQuote is required' };
    }

    ensureFont();

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    const photo = await loadImage(photoBuffer);
    drawCoverImage(ctx, photo, WIDTH, HEIGHT);

    // Semi-transparent charcoal panel on the left so white text stays readable
    const panelWidth = Math.round(WIDTH * 0.52);
    ctx.fillStyle = BRAND_CHARCOAL;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, 0, panelWidth, HEIGHT);
    ctx.globalAlpha = 1;

    // Soft fade at the panel edge into the photo
    const fadeWidth = 120;
    const fadeGrad = ctx.createLinearGradient(panelWidth - fadeWidth, 0, panelWidth + fadeWidth * 0.4, 0);
    fadeGrad.addColorStop(0, 'rgba(43, 41, 41, 0.72)');
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
      console.warn('[generateReshareCardImage] Could not draw AO mark:', err?.message || err);
    }

    return { ok: true, buffer: canvas.toBuffer('image/png') };
  } catch (err) {
    console.error('[generateReshareCardImage]', err?.message || err);
    return { ok: false, error: err?.message || 'Reshare card generation failed' };
  }
}
