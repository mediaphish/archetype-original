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

// ── Font registration ──────────────────────────────────────────────────────────
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
  console.warn('[generateQuoteCardImage] No font file found — text may not render');
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
function parseCardTag(cardTagContent) {
  // Parse attributes from [CARD ...] opening tag
  // Support both quoted and unquoted values, and single or double quotes
  const attrPattern = /(\w+)=["']?([^"'\s\]]+)["']?/g;
  const attrs = {};
  let m;
  while ((m = attrPattern.exec(cardTagContent)) !== null) {
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
  return parseCardTag(attrString + innerContent);
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
function drawImageCover(ctx, img, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
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
      drawImageCover(ctx, art, WIDTH, HEIGHT);
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
  return generateFlexibleCardBuffer(spec);
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
        buffer = await generateFlexibleCardBuffer(spec);
        layoutMode = 'flexible';
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
