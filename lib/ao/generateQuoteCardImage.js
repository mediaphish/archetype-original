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

// Vector brand art, preferred over the raster fallbacks above.
const BRAND_SVGS = {
  lockup: 'archetype-original-lockup.svg',
  mark: 'ao-logo.svg',
};

// The lockup is a stacked mark-over-wordmark, so it needs more vertical room
// than the bare mark to read at the same optical weight.
const LOGO_HEIGHT_SCALE = { lockup: 1.75, mark: 1 };

// ── AO Mark ────────────────────────────────────────────────────────────────────
//
// The mark is Bart's brand asset, not something to approximate. Auto already
// stores it as an SVG in ao_brand_assets (kind logo, variant mark), so cards use
// that file, rasterised at the exact size needed. Vector in means no softness at
// any card size, and no chance of the card and the rest of the brand drifting
// apart.
//
// Two variants ship as vector: the full lockup (mark over the ARCHETYPE ORIGINAL
// wordmark) at public/brand/archetype-original-lockup.svg, supplied by Bart, and
// the mark alone. Cards default to the lockup, matching his reference card.
//
// Do not set the wordmark as type. An earlier version of this file did exactly
// that in the card's display face, which put the brand in a typeface that is not
// the brand's. The words are artwork, not text.
const _aoMarkCache = {};

/** Recolour the single-path brand SVG. The stored file is near-black (#231f20). */
function tintSvg(svgText, color) {
  return String(svgText)
    .replace(/fill:\s*#[0-9a-f]{3,8}/gi, `fill: ${color}`)
    .replace(/fill="#[0-9a-f]{3,8}"/gi, `fill="${color}"`);
}

/**
 * Load the AO mark at a target height.
 *
 * Prefers the stored brand SVG; falls back to the bundled PNGs when the asset
 * or the network is unavailable, so a card still carries a mark rather than
 * none.
 */
async function loadAOMark(filename, { color = '#ffffff', height = 128, variant = 'lockup' } = {}) {
  const cacheKey = `${variant}:${color}@${Math.round(height)}`;
  if (_aoMarkCache[cacheKey]) return _aoMarkCache[cacheKey];

  const { loadImage } = await import('@napi-rs/canvas');

  const svgName = BRAND_SVGS[variant] || BRAND_SVGS.lockup;
  const svgPath = join(process.cwd(), 'public', 'brand', svgName);
  if (existsSync(svgPath)) {
    try {
      const svg = tintSvg(readFileSync(svgPath, 'utf8'), color);
      const sharp = (await import('sharp')).default;
      const png = await sharp(Buffer.from(svg))
        .resize({ height: Math.round(height) })
        .png()
        .toBuffer();
      const img = await loadImage(png);
      _aoMarkCache[cacheKey] = img;
      return img;
    } catch (err) {
      console.warn('[generateQuoteCardImage] brand SVG render failed:', err?.message || err);
    }
  }

  const pngPath = join(process.cwd(), 'public', 'images', filename);
  const img = await loadImage(readFileSync(pngPath));
  _aoMarkCache[cacheKey] = img;
  return img;
}

// ── Inline emphasis ────────────────────────────────────────────────────────────
//
// Bart's cards colour key PHRASES inside a line, not whole lines: "the leaders
// reporting STRESS this year are NOT WEAK." Whole-line colour cannot express
// that, and it is the thing that makes the design read as an argument rather
// than a slogan.
//
// *asterisks* mark an accent span. Chosen because a writer already types it and
// because prose quotes almost never contain a bare asterisk.
export function parseEmphasis(text) {
  const out = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), accent: false });
    out.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < String(text || '').length) out.push({ text: text.slice(last), accent: false });
  return out.filter((s) => s.text.length > 0);
}

/**
 * Wrap segmented text, keeping each visual line's segments intact so colour
 * survives the line break.
 */
function wrapSegments(ctx, segments, maxWidth) {
  const lines = [];
  let current = [];
  let currentText = '';

  for (const seg of segments) {
    // Split on spaces but keep them, so re-joining preserves the original gaps.
    const parts = seg.text.split(/(\s+)/).filter((p) => p !== '');
    for (const part of parts) {
      const candidate = currentText + part;
      if (ctx.measureText(candidate).width > maxWidth && currentText.trim()) {
        lines.push(current);
        current = [];
        currentText = '';
        if (/^\s+$/.test(part)) continue; // do not start a line with the wrapped space
      }
      const lastSeg = current[current.length - 1];
      if (lastSeg && lastSeg.accent === seg.accent) lastSeg.text += part;
      else current.push({ text: part, accent: seg.accent });
      currentText += part;
    }
  }
  if (current.length) lines.push(current);
  return lines.map((segs) => segs.map((x) => ({ ...x, text: x.text })));
}

/** Total width of one wrapped line, for measurement during fitting. */
function lineWidth(ctx, segs) {
  return segs.reduce((w, s) => w + ctx.measureText(s.text).width, 0);
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
    // Colour for *emphasised* spans inside a line.
    accent: attrs.accent || '#D42B1E',
    uppercase: String(attrs.uppercase ?? 'true') !== 'false',
    // 'lockup' (mark + wordmark) or 'mark'. Both are vector brand assets; the
    // wordmark is never set as type.
    logo: (attrs.logo || 'lockup').toLowerCase(),
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
  // Tighter margin so the type fills the panel. Bart on the reference card:
  // "tighter and heavier in the frame ... I want these to feel rich."
  const padX = Math.round(W * 0.045);
  const textX = panelRight ? panelX + padX : padX;
  const textMaxW = panelW - padX * 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const markH = Math.round(H * 0.105);
  const logoH = Math.round(markH * (LOGO_HEIGHT_SCALE[spec.logo === 'mark' ? 'mark' : 'lockup'] || 1));
  const lockupTop = H - padX - logoH;
  const gapAboveLockup = Math.round(H * 0.05);
  const availableH = lockupTop - gapAboveLockup - padX;

  // Lay the type out at a given scale and report how tall it is.
  const layout = (scale) =>
    spec.lines.map((line) => {
      const size = Math.max(14, Math.round(line.size * scale));
      // Emphasis markers must not count toward the length test, or a short line
      // with two accent spans gets downgraded off the display face.
      const plain = line.text.replace(/\*/g, '');
      const family = lineFontFamily(line.font || spec.font, plain);
      ctx.font = `${line.weight} ${size}px ${family}, Arial, sans-serif`;
      // Only the display face is inherently all-caps; leave Inter lines alone so
      // a long quote keeps its sentence case.
      const segments = parseEmphasis(line.text).map((seg) => ({
        ...seg,
        text: spec.uppercase && family === 'Bebas' ? seg.text.toUpperCase() : seg.text,
      }));
      return {
        line,
        family,
        size,
        wrapped: wrapSegments(ctx, segments, textMaxW),
        // Bebas is drawn tight in the reference card — lines nearly touching,
        // the block reading as one dense mass rather than separated rows. Its
        // caps are short relative to the em, so 1.12 left a visible gutter that
        // made the type look thin in the frame. Inter keeps normal leading; it
        // is set at body sizes where tight leading hurts.
        lineH: Math.round(size * (family === 'Bebas' ? 0.92 : 1.24)),
        gap: Math.round((line.gap_after || 0) * scale),
      };
    });
  const heightOf = (bs) => bs.reduce((sum, b) => sum + b.wrapped.length * b.lineH + b.gap, 0);

  // Shrink to fit rather than overflow. Without this a long quote runs straight
  // through the AO mark: the clamp that was here bottomed out at the top pad and
  // silently gave up, which is exactly what a long quote will hit in production.
  // Type getting smaller is a compromise; type crossing the logo is a defect.
  // Fit the type to the panel in both directions. Shrinking prevents a long
  // quote running through the mark; growing stops a short one floating in a
  // half-empty frame, which is what made the first cards feel thin next to the
  // reference. Capped at 1.6x so a three-word quote does not become a poster.
  let scale = 1;
  let blocks = layout(scale);
  let totalTextH = heightOf(blocks);

  for (let i = 0; i < 14; i++) {
    const ratio = availableH / totalTextH;
    if (ratio > 0.995 && ratio < 1.06) break;
    const next = Math.min(1.6, Math.max(0.45, scale * ratio * 0.99));
    if (Math.abs(next - scale) < 0.01) break;
    scale = next;
    blocks = layout(scale);
    totalTextH = heightOf(blocks);
  }
  // Never leave the type overlapping the lockup, whatever the loop settled on.
  while (totalTextH > availableH && scale > 0.45) {
    scale = Math.max(0.45, scale * 0.95);
    blocks = layout(scale);
    totalTextH = heightOf(blocks);
  }

  const firstBaseline = blocks[0].lineH;
  const centredTop = Math.round((lockupTop - totalTextH) / 2);
  const top = Math.max(padX, Math.min(centredTop, lockupTop - gapAboveLockup - totalTextH));
  let y = top + firstBaseline;

  for (const b of blocks) {
    ctx.font = `${b.line.weight} ${b.size}px ${b.family}, Arial, sans-serif`;
    ctx.globalAlpha = b.line.opacity;
    const baseColor = b.line.color || spec.text;
    for (const segs of b.wrapped) {
      // Draw segment by segment so an accent phrase can sit inside a line.
      // Advancing by measured width rather than re-measuring the whole line
      // keeps the colour change invisible in the spacing.
      let x = textX;
      for (const seg of segs) {
        ctx.fillStyle = seg.accent ? spec.accent : baseColor;
        ctx.fillText(seg.text, x, y);
        x += ctx.measureText(seg.text).width;
      }
      y += b.lineH;
    }
    ctx.globalAlpha = 1;
    y += b.gap;
  }

  // ── Logo lockup ──────────────────────────────────────────────────────────────
  if (spec.mark !== 'hidden') {
    try {
      const variant = spec.logo === 'mark' ? 'mark' : 'lockup';
      const logoH = Math.round(markH * (LOGO_HEIGHT_SCALE[variant] || 1));
      const img = await loadAOMark(MARK_FILES[spec.mark] || MARK_FILES.offwhite, {
        color: spec.mark === 'black' ? '#0a0a0a' : '#f2f2f0',
        height: logoH,
        variant,
      });
      const logoW = Math.round(logoH * (img.width / img.height));
      ctx.globalAlpha = spec.mark_opacity;
      ctx.drawImage(img, textX, H - padX - logoH, logoW, logoH);
      ctx.globalAlpha = 1;
    } catch (err) {
      console.warn('[generateQuoteCardImage] logo render failed:', err?.message || err);
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
/**
 * Normalize an encoded image so @napi-rs/canvas can decode it.
 *
 * Every gpt-image-1 PNG carries a C2PA content-credentials chunk (`caBX`,
 * ~23KB) ahead of the image data. The canvas decoder cannot read past it and
 * reports "Invalid SVG image" — on a file whose header is a perfectly ordinary
 * 8-bit RGB PNG. Left unhandled, every AI-generated card would have failed
 * while looking like a corrupt download.
 *
 * sharp re-encodes and drops unknown ancillary chunks. It is already a
 * dependency. If it is unavailable the original buffer is returned so a
 * decodable image still works.
 */
async function normalizeImageBuffer(buf) {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buf).png().toBuffer();
  } catch (err) {
    console.warn('[generateQuoteCardImage] image normalize skipped:', err?.message || err);
    return buf;
  }
}

async function loadBackgroundArtwork(url) {
  try {
    const src = String(url || '').trim();
    if (!src) return null;

    const { loadImage } = await import('@napi-rs/canvas');

    // Decode data: URIs ourselves. Passing one straight to loadImage sniffs the
    // type unreliably — a PNG data URI came back as "Invalid SVG image" while a
    // JPEG one loaded fine.
    if (src.startsWith('data:')) {
      const comma = src.indexOf(',');
      if (comma === -1) return null;
      const meta = src.slice(5, comma);
      const payload = src.slice(comma + 1);
      const buf = meta.includes(';base64')
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf8');
      return await loadImage(await normalizeImageBuffer(buf));
    }

    const res = await fetch(src);
    if (!res.ok) {
      console.warn(`[generateQuoteCardImage] background fetch failed (${res.status}): ${src}`);
      return null;
    }
    return await loadImage(await normalizeImageBuffer(Buffer.from(await res.arrayBuffer())));
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
