/**
 * Quote card PNG (1080×1080) + upload to Supabase ao-auto-attachments.
 *
 * Flexible layout engine — renders any card layout Auto describes via [CARD] tags.
 * Falls back to the legacy two-line format when no [CARD] tags are present.
 *
 * [CARD] tag format:
 * [CARD bg="#0a0a0a" text="#ffffff" mark="offwhite" mark_position="bottom_center" mark_opacity="0.5"]
 * [LINE size="64" opacity="1.0" weight="bold"]Your text here[/LINE]
 * [LINE size="44" opacity="0.6" weight="bold"]Secondary line[/LINE]
 * [/CARD]
 *
 * mark values: offwhite, black, hidden
 * mark_position values: bottom_center, bottom_left, bottom_right, top_center, hidden
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { supabaseAdmin } from '../supabase-admin.js';
import { isTooLongForDisplayFace } from './cardTypography.js';

// ── Font registration ──────────────────────────────────────────────────────────
//
// Bebas Neue is the card display face, chosen against the reference card Bart
// supplied: at 62px "TOXIC LEADERSHIP" sets 343px wide against Inter's 584px,
// so the claim fits one line instead of wrapping to two.
//
// It has no lowercase. That is fine for a short claim and bad for a long corpus
// pull — forty words of all-caps is a wall. So Inter stays registered and any
// line can opt into it, which is what attribution lines and long quotes should
// do. SIL OFL, license bundled alongside the file.
const FONT_FILES = {
  Bebas: ['BebasNeue-Regular.ttf'],
  Inter: ['Inter-Bold.ttf', 'Inter-Bold.otf', 'inter-bold.ttf'],
  Playfair: ['PlayfairDisplay-BoldItalic.ttf'],
};

export const DISPLAY_FONT = 'Bebas';
export const TEXT_FONT = 'Inter';

let fontRegistered = false;
const registeredFamilies = new Set();

function ensureFont() {
  if (fontRegistered) return;
  for (const [family, candidates] of Object.entries(FONT_FILES)) {
    for (const filename of candidates) {
      const p = join(process.cwd(), 'public', 'fonts', filename);
      if (existsSync(p)) {
        GlobalFonts.registerFromPath(p, family);
        registeredFamilies.add(family);
        break;
      }
    }
  }
  fontRegistered = true;
  if (!registeredFamilies.has('Inter')) {
    console.warn('[generateQuoteCardImage] Inter not found — text may not render');
  }
  if (!registeredFamilies.has('Bebas')) {
    console.warn('[generateQuoteCardImage] Bebas Neue not found — falling back to Inter');
  }
}

/**
 * Resolve the family for one line, downgrading the display face when the line
 * is too long for it.
 */
function lineFontFamily(requested, text) {
  const family = fontFamily(requested);
  if (family === 'Bebas' && isTooLongForDisplayFace(text)) return fontFamily('inter');
  return family;
}

/**
 * Resolve a font name from a card or line attribute to a registered family.
 * Falls back to Inter when the requested face is unavailable, so a missing font
 * file yields a plainer card rather than an unreadable one.
 */
function fontFamily(name) {
  const key = String(name || '').trim().toLowerCase();
  const family =
    key === 'inter' ? 'Inter'
    : key === 'playfair' ? 'Playfair'
    : key === 'bebas' || key === 'bebasneue' ? 'Bebas'
    : DISPLAY_FONT;
  return registeredFamilies.has(family) ? family : 'Inter';
}

// ── Constants ──────────────────────────────────────────────────────────────────
const WIDTH = 1080;
const HEIGHT = 1080;
const MAX_TEXT_WIDTH = 860;
const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

const MARK_FILES = {
  offwhite: 'ao-logo-offwhite.png',
  black: 'ao-logo-black.png',
};

// ── AO Mark cache ──────────────────────────────────────────────────────────────
const _aoMarkCache = {};

async function loadAOMark(filename) {
  if (_aoMarkCache[filename]) return _aoMarkCache[filename];
  const { loadImage } = await import('@napi-rs/canvas');
  const pngPath = join(process.cwd(), 'public', 'images', filename);
  const pngBuffer = readFileSync(pngPath);
  _aoMarkCache[filename] = await loadImage(pngBuffer);
  return _aoMarkCache[filename];
}

// ── Word wrap ──────────────────────────────────────────────────────────────────
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

// ── [CARD] tag parser ──────────────────────────────────────────────────────────
function parseCardTag(cardTagContent, openingAttrs) {
  // Card attributes come from the [CARD ...] opening tag ONLY.
  //
  // They used to be scanned from the whole block, including the [LINE] tags.
  // Any attribute name shared by both then leaked upward: a single
  // font="inter" on an attribution line silently set the font for the entire
  // card, which is why the first Bebas render came out in Inter. color, size
  // and weight collide the same way.
  const attrPattern = /(\w+)=["']?([^"'\s\]]+)["']?/g;
  const attrs = {};
  let m;
  const attrSource = openingAttrs !== undefined ? openingAttrs : cardTagContent;
  while ((m = attrPattern.exec(attrSource)) !== null) {
    attrs[m[1]] = m[2];
  }

  // Parse [LINE ...] blocks
  const linePattern = /\[LINE([^\]]*)\]([\s\S]*?)\[\/LINE\]/gi;
  const lines = [];
  while ((m = linePattern.exec(cardTagContent)) !== null) {
    const lineAttrs = {};
    const lineAttrPattern = /(\w+)=["']?([^"'\s\]]+)["']?/g;
    let la;
    while ((la = lineAttrPattern.exec(m[1])) !== null) {
      lineAttrs[la[1]] = la[2];
    }
    lines.push({
      text: m[2].trim(),
      size: parseInt(lineAttrs.size || '64', 10),
      opacity: parseFloat(lineAttrs.opacity || '1.0'),
      weight: lineAttrs.weight || 'bold',
      gap_after: parseInt(lineAttrs.gap_after || '0', 10),
      // Per-line colour drives the two-tone emphasis in the reference card:
      // the claim in red, the rest in off-white.
      color: lineAttrs.color || null,
      // Long quotes and attribution should opt into Inter — Bebas has no
      // lowercase, and a long all-caps passage stops being readable.
      font: lineAttrs.font || null,
    });
  }

  return {
    bg: attrs.bg || '#0a0a0a',
    text: attrs.text || '#ffffff',
    mark: attrs.mark || 'offwhite',
    mark_position: attrs.mark_position || 'bottom_center',
    mark_opacity: attrs.mark_opacity !== undefined ? parseFloat(attrs.mark_opacity) : 0.5,
    // Optional generated artwork behind the quote. Bart: "Nice images with the
    // quotes in front of them when they aren't mine. When they are mine,
    // stylized images of me using my likeness so it looks like I'm sharing
    // the quote."
    //
    // The image model paints; this canvas sets the type. That split is
    // deliberate — gpt-image-1 garbles rendered text and mangles the AO logo
    // lockup, which is why every card shipped so far was made by hand. Neither
    // problem exists if the model never draws a glyph.
    bg_image: attrs.bg_image || null,
    // Darkening layer over the artwork so the quote stays legible on any image.
    // 0 disables it; the default is tuned for photographic backgrounds.
    scrim: attrs.scrim !== undefined ? parseFloat(attrs.scrim) : 0.55,

    // layout="split" puts the subject on one side and the quote in a panel on
    // the other, so type never crosses a face. Anything else keeps the original
    // centred layout.
    layout: (attrs.layout || 'centered').toLowerCase(),
    ratio: (attrs.ratio || 'portrait').toLowerCase(),
    subject_side: (attrs.subject_side || 'right').toLowerCase(),
    panel_width: attrs.panel_width !== undefined ? parseFloat(attrs.panel_width) : 0.52,
    // Where to anchor the artwork when cover-scaling crops it. focus_y defaults
    // high because faces sit in the upper third; centring decapitated the
    // subject in the first split render.
    focus_x: attrs.focus_x !== undefined ? parseFloat(attrs.focus_x) : 0.5,
    focus_y: attrs.focus_y !== undefined ? parseFloat(attrs.focus_y) : 0.22,
    font: attrs.font || DISPLAY_FONT,
    uppercase: String(attrs.uppercase ?? 'true') !== 'false',
    wordmark: String(attrs.wordmark ?? 'true') !== 'false',
    lines,
  };
}

function extractCardSpec(fullCardBlock) {
  // fullCardBlock is the content between [CARD ...] and [/CARD]
  // including the opening tag attributes
  const openingTagMatch = fullCardBlock.match(/^\[CARD([^\]]*)\]/i);
  if (!openingTagMatch) return null;
  const attrString = openingTagMatch[1];
  const innerContent = fullCardBlock.slice(openingTagMatch[0].length);
  return parseCardTag(attrString + innerContent, attrString);
}

// ── Split layout ───────────────────────────────────────────────────────────────
//
// The layout Bart asked for: subject on one side, quote in a dark panel on the
// other. Nothing overlays the face, which is the flaw in scrim-over-photo — a
// quote landing across someone's eyes reads as a mistake no matter how legible
// the type is.
//
// Instagram takes 1:1, 4:5, and 1.91:1. 4:5 gives the most feed real estate,
// so it is the default; square and landscape are available per card.
const CARD_RATIOS = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  landscape: { w: 1440, h: 1080 },
};

/**
 * Render the split-panel card: artwork on one side, quote panel on the other.
 */
async function generateSplitCardBuffer(spec) {
  ensureFont();

  const { w: W, h: H } = CARD_RATIOS[spec.ratio] || CARD_RATIOS.portrait;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const panelRight = spec.subject_side === 'left';
  const panelW = Math.round(W * spec.panel_width);

  ctx.fillStyle = spec.bg;
  ctx.fillRect(0, 0, W, H);

  // Artwork fills the whole frame; the panel is laid over it. Covering the full
  // canvas rather than only the subject half means the fade has real image to
  // dissolve into instead of a hard seam.
  if (spec.bg_image) {
    const art = await loadBackgroundArtwork(spec.bg_image);
    if (art) drawImageCover(ctx, art, W, H, spec.focus_x, spec.focus_y);
  }

  // Solid panel, then a gradient that carries the panel colour into the artwork
  // so the two halves read as one photograph rather than a paste-up.
  const panelX = panelRight ? W - panelW : 0;
  ctx.fillStyle = spec.bg;
  ctx.fillRect(panelX, 0, panelW, H);

  const fadeW = Math.round(W * 0.30);
  const fadeX = panelRight ? panelX - fadeW : panelW;
  const grad = ctx.createLinearGradient(
    panelRight ? fadeX + fadeW : fadeX,
    0,
    panelRight ? fadeX : fadeX + fadeW,
    0
  );
  grad.addColorStop(0, hexToRgba(spec.bg, 1));
  grad.addColorStop(1, hexToRgba(spec.bg, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(fadeX, 0, fadeW, H);

  // ── Type ─────────────────────────────────────────────────────────────────────
  const padX = Math.round(W * 0.055);
  const textX = panelRight ? panelX + padX : padX;
  const textMaxW = panelW - padX * 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const markH = Math.round(H * 0.105);
  const wordmarkH = spec.wordmark ? Math.round(markH * 0.3) * 2 + 28 : 0;
  const lockupTop = H - padX - wordmarkH - markH;
  const gapAboveLockup = Math.round(H * 0.05);
  const availableH = lockupTop - gapAboveLockup - padX;

  // Lay the type out at a given scale and report how tall it is.
  const layout = (scale) =>
    spec.lines.map((line) => {
      const size = Math.max(14, Math.round(line.size * scale));
      const family = lineFontFamily(line.font || spec.font, line.text);
      ctx.font = `${line.weight} ${size}px ${family}, Arial, sans-serif`;
      // Only the display face is inherently all-caps; leave Inter lines alone so
      // a long quote keeps its sentence case.
      const text = spec.uppercase && family === 'Bebas' ? line.text.toUpperCase() : line.text;
      return {
        line,
        family,
        size,
        wrapped: wrapText(ctx, text, textMaxW),
        lineH: Math.round(size * 1.12),
        gap: Math.round((line.gap_after || 0) * scale),
      };
    });
  const heightOf = (bs) => bs.reduce((sum, b) => sum + b.wrapped.length * b.lineH + b.gap, 0);

  // Shrink to fit rather than overflow. Without this a long quote runs straight
  // through the AO mark: the clamp that was here bottomed out at the top pad and
  // silently gave up, which is exactly what a long quote will hit in production.
  // Type getting smaller is a compromise; type crossing the logo is a defect.
  let blocks = layout(1);
  let totalTextH = heightOf(blocks);
  for (let i = 0; i < 12 && totalTextH > availableH; i++) {
    const scale = Math.max(0.45, (availableH / totalTextH) * 0.98);
    blocks = layout(scale);
    const next = heightOf(blocks);
    if (next >= totalTextH) break;
    totalTextH = next;
  }

  const firstBaseline = blocks[0].lineH;
  const centredTop = Math.round((lockupTop - totalTextH) / 2);
  const top = Math.max(padX, Math.min(centredTop, lockupTop - gapAboveLockup - totalTextH));
  let y = top + firstBaseline;

  for (const b of blocks) {
    ctx.font = `${b.line.weight} ${b.size}px ${b.family}, Arial, sans-serif`;
    ctx.fillStyle = b.line.color || spec.text;
    ctx.globalAlpha = b.line.opacity;
    for (const wl of b.wrapped) {
      ctx.fillText(wl, textX, y);
      y += b.lineH;
    }
    ctx.globalAlpha = 1;
    y += b.gap;
  }

  // ── Logo lockup ──────────────────────────────────────────────────────────────
  if (spec.mark !== 'hidden') {
    try {
      const img = await loadAOMark(MARK_FILES[spec.mark] || MARK_FILES.offwhite);
      const markW = Math.round(markH * (img.width / img.height));
      // Reserve the wordmark's own height before placing the mark, or the two
      // text lines run past the bottom edge — "ORIGINAL" sat 16px from the
      // frame on a square card.
      const wmSize = Math.round(markH * 0.3);
      const wordmarkH = spec.wordmark ? wmSize * 2 + 28 : 0;
      const markY = H - padX - wordmarkH - markH;
      ctx.globalAlpha = spec.mark_opacity;
      ctx.drawImage(img, textX, markY, markW, markH);

      // Wordmark set as type. There is no lockup asset in the repo — only the
      // mark — so the words are drawn rather than placed.
      if (spec.wordmark) {
        ctx.fillStyle = spec.text;
        ctx.font = `bold ${wmSize}px ${fontFamily(spec.font)}, Arial, sans-serif`;
        ctx.fillText('ARCHETYPE', textX, markY + markH + wmSize + 10);
        ctx.font = `normal ${Math.round(wmSize * 0.86)}px ${fontFamily(spec.font)}, Arial, sans-serif`;
        ctx.fillText('ORIGINAL', textX, markY + markH + wmSize * 2 + 18);
      }
      ctx.globalAlpha = 1;
    } catch (err) {
      console.warn('[generateQuoteCardImage] mark render failed:', err?.message || err);
    }
  }

  return canvas.toBuffer('image/png');
}

/** #rrggbb -> rgba() at the given alpha. Gradients need a transparent stop of the same hue. */
function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
  if (!m) return `rgba(10,10,10,${alpha})`;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Background artwork ─────────────────────────────────────────────────────────

/**
 * Fetch generated artwork for the card background.
 *
 * Returns null on any failure. A card without its artwork still posts; a card
 * that throws does not, and the scheduled slot is simply missed. Given the
 * cadence runs unattended, degrading beats failing.
 */
async function loadBackgroundArtwork(url) {
  try {
    const src = String(url || '').trim();
    if (!src) return null;

    const { loadImage } = await import('@napi-rs/canvas');

    if (src.startsWith('data:')) return await loadImage(src);

    const res = await fetch(src);
    if (!res.ok) {
      console.warn(`[generateQuoteCardImage] background fetch failed (${res.status}): ${src}`);
      return null;
    }
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    console.warn('[generateQuoteCardImage] background load failed:', err?.message || err);
    return null;
  }
}

/**
 * Draw an image at cover scale, centred — the CSS `object-fit: cover` rule.
 *
 * Artwork arrives 1024x1024 from gpt-image-1 while cards are 1080x1080, so a
 * naive full-canvas draw would stretch a face. Cropping is the lesser harm when
 * the subject is a likeness.
 */
function drawImageCover(ctx, img, w, h, focusX = 0.5, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  // focusY 0 keeps the top edge, 1 the bottom. Centring is the wrong default for
  // a portrait: it cropped the top of Bart's head in the first split render,
  // because a face sits in the upper third of a standing or seated frame.
  ctx.drawImage(img, -(dw - w) * focusX, -(dh - h) * focusY, dw, dh);
}

// ── Flexible canvas render ─────────────────────────────────────────────────────
async function generateFlexibleCardBuffer(spec) {
  ensureFont();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background: the solid colour is painted first regardless, so a failed or
  // missing artwork fetch degrades to the card that has always shipped rather
  // than to a broken image. A plain card is a worse card; a missing card is a
  // missed post.
  ctx.fillStyle = spec.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (spec.bg_image) {
    const art = await loadBackgroundArtwork(spec.bg_image);
    if (art) {
      drawImageCover(ctx, art, WIDTH, HEIGHT, spec.focus_x, spec.focus_y);
      if (spec.scrim > 0) {
        // Flat wash plus a stronger foot: the AO mark and attribution sit low,
        // and photographic backgrounds are usually brightest there.
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(Math.max(spec.scrim, 0), 1)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const grad = ctx.createLinearGradient(0, HEIGHT * 0.55, 0, HEIGHT);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.45);
      }
    }
  }

  ctx.fillStyle = spec.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate total text block height
  const lineHeights = spec.lines.map((line) => {
    ctx.font = `${line.weight} ${line.size}px Inter, Arial, sans-serif`;
    const wrapped = wrapText(ctx, line.text, MAX_TEXT_WIDTH);
    const lineH = Math.round(line.size * 1.35);
    return {
      ...line,
      wrapped,
      lineH,
      totalH: wrapped.length * lineH + (line.gap_after || 0),
    };
  });

  // Add gaps between line groups (16px default between different lines)
  const GAP_BETWEEN = 24;
  let totalH = lineHeights.reduce((sum, l, i) => {
    return sum + l.totalH + (i < lineHeights.length - 1 ? GAP_BETWEEN : 0);
  }, 0);

  // Center the text block vertically (slightly above true center for visual balance)
  let currentY = HEIGHT * 0.42 - totalH / 2;

  for (let i = 0; i < lineHeights.length; i++) {
    const line = lineHeights[i];
    ctx.font = `${line.weight} ${line.size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = spec.text;
    ctx.globalAlpha = line.opacity;

    for (let j = 0; j < line.wrapped.length; j++) {
      ctx.fillText(line.wrapped[j], WIDTH / 2, currentY + line.lineH / 2 + j * line.lineH);
    }

    currentY += line.totalH + (i < lineHeights.length - 1 ? GAP_BETWEEN : 0);
    ctx.globalAlpha = 1.0;
  }

  // Draw AO mark
  if (spec.mark !== 'hidden' && spec.mark_position !== 'hidden') {
    const markFile = MARK_FILES[spec.mark] || MARK_FILES.offwhite;
    try {
      const img = await loadAOMark(markFile);
      const markH = 80;
      const markW = markH * (img.width / img.height);

      let markX = (WIDTH - markW) / 2;
      let markY = HEIGHT - markH - 60;

      if (spec.mark_position === 'bottom_left') {
        markX = 60;
        markY = HEIGHT - markH - 60;
      } else if (spec.mark_position === 'bottom_right') {
        markX = WIDTH - markW - 60;
        markY = HEIGHT - markH - 60;
      } else if (spec.mark_position === 'top_center') {
        markX = (WIDTH - markW) / 2;
        markY = 60;
      } else if (spec.mark_position === 'top_left') {
        markX = 60;
        markY = 60;
      } else if (spec.mark_position === 'top_right') {
        markX = WIDTH - markW - 60;
        markY = 60;
      }

      ctx.save();
      ctx.globalAlpha = spec.mark_opacity;
      ctx.drawImage(img, markX, markY, markW, markH);
      ctx.restore();
    } catch (err) {
      console.warn('[generateQuoteCardImage] Could not draw AO mark:', err.message);
    }
  }

  return canvas.toBuffer('image/png');
}

// ── Legacy two-line render (fallback) ──────────────────────────────────────────
async function generateLegacyCardBuffer(line1, line2, theme) {
  ensureFont();

  const THEMES = {
    dark: { bgColor: '#0a0a0a', textColor: '#ffffff', markFile: 'ao-logo-offwhite.png', markOpacity: 0.5 },
    light: { bgColor: '#ffffff', textColor: '#0a0a0a', markFile: 'ao-logo-black.png', markOpacity: 0.5 },
  };
  const t = THEMES[theme] || THEMES.dark;
  const FONT_SIZE = 64;
  const LINE_HEIGHT = 88;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = t.bgColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = t.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${FONT_SIZE}px Inter, Arial, sans-serif`;

  const hasLine2 = String(line2 || '').trim().length > 0;

  if (!hasLine2) {
    const lines = wrapText(ctx, line1, MAX_TEXT_WIDTH);
    const totalH = lines.length * LINE_HEIGHT;
    const startY = HEIGHT / 2 - totalH / 2 + LINE_HEIGHT / 2;
    lines.forEach((l, i) => ctx.fillText(l, WIDTH / 2, startY + i * LINE_HEIGHT));
  } else {
    const lines1 = wrapText(ctx, line1, MAX_TEXT_WIDTH);
    const lines2 = wrapText(ctx, line2, MAX_TEXT_WIDTH);
    const totalH = (lines1.length + lines2.length) * LINE_HEIGHT;
    const startY = HEIGHT * 0.42 - totalH / 2 + LINE_HEIGHT / 2;
    lines1.forEach((l, i) => ctx.fillText(l, WIDTH / 2, startY + i * LINE_HEIGHT));
    const line2StartY = startY + lines1.length * LINE_HEIGHT + LINE_HEIGHT * 0.4;
    lines2.forEach((l, i) => ctx.fillText(l, WIDTH / 2, line2StartY + i * LINE_HEIGHT));
  }

  try {
    const img = await loadAOMark(t.markFile);
    const markH = 80;
    const markW = markH * (img.width / img.height);
    ctx.save();
    ctx.globalAlpha = t.markOpacity;
    ctx.drawImage(img, (WIDTH - markW) / 2, HEIGHT - markH - 60, markW, markH);
    ctx.restore();
  } catch (err) {
    console.warn('[generateQuoteCardImage] Could not draw AO mark:', err.message);
  }

  return canvas.toBuffer('image/png');
}

// ── Main export ────────────────────────────────────────────────────────────────
/**
 * @param {{
 *   line1?: string,
 *   line2?: string,
 *   card_spec?: string,  — Full [CARD]...[/CARD] block for flexible layout
 *   card_index?: number,
 *   batch_id?: string,
 *   theme?: string       — 'dark' | 'light' (legacy fallback only)
 * }} opts
 */
/**
 * Render a [CARD] spec to a PNG buffer without uploading it.
 *
 * Exported so the card can be inspected as an image rather than asserted about
 * in the abstract — layout, legibility over artwork, and the degrade path when
 * artwork fails to load are all things you have to look at to judge.
 */
export async function renderCardBuffer(cardSpec) {
  const spec = extractCardSpec(String(cardSpec || '').trim());
  if (!spec || !spec.lines.length) throw new Error('Invalid card spec');
  return spec.layout === 'split'
    ? generateSplitCardBuffer(spec)
    : generateFlexibleCardBuffer(spec);
}

export async function generateQuoteCardImage({ line1, line2, card_spec, card_index, batch_id, theme = 'dark' }) {
  try {
    // Detect malformed LINE tags — e.g. [LINE size="48" opacity="0.85" weight="normal">
    // instead of [LINE size="48" opacity="0.85" weight="normal"]
    // These render raw tag syntax onto the card instead of the intended text.
    const malformedTagRe = /\[LINE[^\]]*">[^[]+/i;
    if (malformedTagRe.test(card_spec || '')) {
      console.error('[generateQuoteCardImage] Malformed LINE tag detected — tag uses ">" instead of "]". Card spec rejected:', String(card_spec || '').slice(0, 300));
      return { ok: false, error: 'Malformed LINE tag detected. Use ] not > to close LINE tag attributes.' };
    }

    let buffer;
    let layoutMode = 'legacy';

    if (card_spec && card_spec.trim()) {
      // Flexible layout mode
      const spec = extractCardSpec(card_spec.trim());
      if (spec && spec.lines.length > 0) {
        if (spec.layout === 'split') {
          buffer = await generateSplitCardBuffer(spec);
          layoutMode = 'split';
        } else {
          buffer = await generateFlexibleCardBuffer(spec);
          layoutMode = 'flexible';
        }
      }
    }

    if (!buffer) {
      // Legacy fallback — requires at least line1
      if (!String(line1 || '').trim()) {
        return { ok: false, error: 'line1 is required when not using card_spec.' };
      }
      buffer = await generateLegacyCardBuffer(
        String(line1).trim(),
        String(line2 || '').trim(),
        theme
      );
    }

    const timestamp = Date.now();
    const idx = card_index ? `-${card_index}` : '';
    const batch = batch_id ? `-${batch_id}` : '';
    const themeTag = layoutMode === 'flexible' ? '-flex' : theme === 'light' ? '-light' : '';
    const filename = `card${idx}${batch}${themeTag}-${timestamp}.png`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
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
