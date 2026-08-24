/**
 * Quote cards built on fixed photographic plates.
 *
 * The history matters, because it explains why this file exists at all.
 *
 * Every earlier attempt had gpt-image-1 paint the man AND set the type in one
 * generation. Those two jobs want opposite things. The photograph wants
 * generative variance; the typography wants to be byte-identical every time.
 * Asking one call to do both produced, across a single afternoon: hair that
 * drifted copper, an attribution that rendered as "GALLUP| 2026" instead of a
 * comma, a fabricated "Q2 RESULTS DOWN 17%" chart invented on a wall, and a
 * chain of revisions where each fix broke something that had been right.
 * Roughly half of all rolls were unusable, which is why single-shot generation
 * felt like it never worked.
 *
 * Bart's solution removed the problem instead of managing it: shoot a library of
 * plates once, with the subject on the right, the left side clear, and the AO
 * lockup already burned in. Then the only remaining job is setting type on a
 * constant. No variance, no approval step, no API call, no cost.
 *
 * Two things this has to get right that the split layout does not:
 *
 *   1. It must NOT draw a lockup. The plate already has one. A second one is a
 *      defect, not a duplicate.
 *
 *   2. It must not let type collide with that baked-in lockup — and the lockup
 *      is not the same size on every plate. On variation_01 it occupies the
 *      bottom ~11% of the frame; on variation_07 it is noticeably larger and
 *      starts higher. A hardcoded safe zone would clip type on one plate and
 *      float it on another, so the lockup is measured per plate instead.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';
import {
  ensureFont,
  parseEmphasis,
  wrapSegments,
  DISPLAY_FONT,
  TEXT_FONT,
} from './cardText.js';

/** Where Bart drops the shot plates. */
export const PLATE_DIR = path.join(process.cwd(), 'public', 'images', 'cards');

const PLATE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** House red, matching the approved cards. */
export const ACCENT = '#D42B1E';

/**
 * List the available plates, newest naming first.
 *
 * Filters by extension rather than by "not a dotfile", because macOS drops a
 * .DS_Store into any folder Finder has opened and it would otherwise be offered
 * to the renderer as a plate.
 */
export function listPlates(dir = PLATE_DIR) {
  if (!fs.existsSync(dir)) return [];

  const names = fs
    .readdirSync(dir)
    .filter((name) => !name.startsWith('.') && PLATE_EXTENSIONS.has(path.extname(name).toLowerCase()));

  // The plates ship as JPEG — 30MB of PNG became 3.3MB with no visible change,
  // and the library keeps growing. Bart's PNG originals stay on his disk and are
  // git-ignored, so both can be present locally. Counting each plate twice would
  // double it in rotation and render the same photograph two cards running.
  const byBase = new Map();
  for (const name of names.sort()) {
    const base = name.replace(/\.[^.]+$/, '');
    const isJpeg = /\.jpe?g$/i.test(name);
    if (!byBase.has(base) || isJpeg) byBase.set(base, name);
  }

  return [...byBase.values()].sort();
}

/**
 * Pick a plate that has not been used lately.
 *
 * Bart is building this library over time, so it has to behave sensibly at every
 * size: with two plates it simply alternates, and with twenty it avoids the last
 * handful. If every available plate is in the recent list the exclusion is
 * dropped rather than returning nothing — repeating a plate is a blemish,
 * failing to produce a card is a defect.
 *
 * Recency is matched on the basename. The library moved from PNG to JPEG once
 * already, and comparing whole filenames would have quietly stopped excluding
 * anything the moment an extension changed.
 */
export function choosePlate(available, recent = []) {
  if (!available.length) return null;
  const base = (name) => name.replace(/\.[^.]+$/, '');

  const fresh = available.filter((name) => !recent.includes(base(name)));
  const pool = fresh.length ? fresh : available;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Locate the AO lockup that is already printed on the plate.
 *
 * Two things have to be worked out, and neither can be assumed:
 *
 *   1. Which side it is on. The plate set is not all one orientation —
 *      variation_08 and variation_10 are mirrored, with the subject on the left
 *      and the clear space and lockup on the right. Assuming "bottom left" put
 *      the quote straight across his chest on those.
 *
 *   2. Where its top edge is. The lockup is not the same size on every plate:
 *      measured tops run from 0.75 to 0.86 of frame height. A fixed safe zone
 *      would clip type on one plate and float it on another.
 *
 * Detection keys on the lockup being NEUTRAL white — the one thing in frame that
 * is both very bright and has no colour cast. A plain luminance threshold does
 * not work: the cream cardigan in variation_08 is bright enough to beat it, and
 * that is exactly what fooled the first version into reporting the lockup at
 * mid-frame. Requiring the channels to be within 18 of each other rejects warm
 * fabric, skin and the edison bulb, and keeps the white ink.
 *
 * @returns {Promise<{ side: 'left'|'right', top: number }>} top as a fraction of height.
 */
export async function measureLockup(plateBuffer, { minLuma = 230, maxChroma = 18, minRowPixels = 8 } = {}) {
  const { data, info } = await sharp(plateBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const yMin = Math.floor(height * 0.5);

  const isInk = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 601 luma. Cheaper than a colour-space conversion and accurate enough.
    if (0.299 * r + 0.587 * g + 0.114 * b <= minLuma) return false;
    return Math.max(r, g, b) - Math.min(r, g, b) < maxChroma;
  };

  /** Count neutral-white pixels in a horizontal band, and find its top row. */
  const scan = (xStart, xEnd) => {
    let total = 0;
    let top = null;
    for (let y = yMin; y < height; y++) {
      let row = 0;
      for (let x = xStart; x < xEnd; x++) {
        if (isInk((y * width + x) * channels)) row++;
      }
      total += row;
      // The row floor is what stops a lone specular speck on the chair leather
      // from being read as the top of the wordmark.
      if (top === null && row >= minRowPixels) top = y / height;
    }
    return { total, top };
  };

  const left = scan(0, Math.floor(width * 0.35));
  const right = scan(Math.floor(width * 0.65), width);

  const side = right.total > left.total ? 'right' : 'left';
  const found = side === 'right' ? right : left;

  // 0.78 sits above every lockup measured across the plate set, so a plate that
  // defeats detection loses a little type size rather than gaining a collision.
  return { side, top: found.top ?? 0.78 };
}

/**
 * Compose a quote onto a plate.
 *
 * @param {object} opts
 * @param {string}  opts.plate        Filename inside PLATE_DIR, e.g. 'variation_01.png'.
 * @param {string}  opts.quote        The quote. Wrap a span in *asterisks* to set it in the accent colour.
 * @param {string} [opts.attribution] Source line, e.g. 'Gallup, 2026'. An em dash is never used; the
 *                                    en dash prefix below matches the approved cards.
 * @param {string} [opts.accent]      Accent colour for emphasised spans.
 * @param {number} [opts.textWidth]   Fraction of frame width the type may occupy.
 * @param {number} [opts.scrim]       Opacity of a left-side darkening gradient, for lighter plates.
 * @returns {Promise<Buffer>} PNG at the plate's native resolution.
 */
export async function renderPlateCard({
  plate,
  quote,
  attribution = '',
  accent = ACCENT,
  textWidth = 0.5,
  scrim = 0,
  plateDir = PLATE_DIR,
}) {
  ensureFont();

  if (!quote || !String(quote).trim()) throw new Error('renderPlateCard: quote is required');

  const platePath = path.join(plateDir, plate);
  if (!fs.existsSync(platePath)) {
    throw new Error(`renderPlateCard: plate not found: ${plate}. Available: ${listPlates(plateDir).join(', ')}`);
  }

  const rawPlate = fs.readFileSync(platePath);
  const lockup = await measureLockup(rawPlate);

  // Re-encode before decoding. PNGs that came out of an image model carry a
  // C2PA provenance chunk (caBX), and @napi-rs/canvas rejects the whole file
  // with "Invalid SVG image" rather than skipping the chunk it does not know.
  // sharp drops non-essential chunks on write, so this is the strip.
  const plateBuffer = await sharp(rawPlate).png().toBuffer();

  const img = await loadImage(plateBuffer);
  const W = img.width;
  const H = img.height;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  // Drawn 1:1. The plates are already the finished frame, so any cover-scaling
  // here would crop the composition Bart shot deliberately.
  ctx.drawImage(img, 0, 0, W, H);

  const padX = Math.round(W * 0.045);

  // The type goes on whichever side the lockup is on, because that is the side
  // Bart left clear. On the mirrored plates the clear zone is narrower, so the
  // text column is narrower too rather than running under the subject.
  const onRight = lockup.side === 'right';
  const maxTextW = Math.round(W * (onRight ? Math.min(textWidth, 0.38) : textWidth));
  const textX = onRight ? W - padX - maxTextW : padX;

  // Optional legibility layer. Off by default: the dark-brick plates carry the
  // type unaided, and a scrim over good brick only makes it look washed. Lighter
  // plates can opt in per card. It follows the type to the correct side.
  if (scrim > 0) {
    const spanW = W * 0.7;
    const grad = onRight
      ? ctx.createLinearGradient(W, 0, W - spanW, 0)
      : ctx.createLinearGradient(0, 0, spanW, 0);
    grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(Math.max(scrim, 0), 1)})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(onRight ? W - spanW : 0, 0, spanW, H);
  }

  const lockupTop = Math.round(H * lockup.top);
  // Generous. On the first proof the attribution sat almost touching the printed
  // lockup, which read as one crowded block instead of two separate marks.
  const gapAboveLockup = Math.round(H * 0.09);
  // The type starts high, matching the approved card, where the quote occupies
  // the upper half and the space beneath it is deliberate rather than filled.
  const textTop = Math.round(H * 0.15);
  const availableH = lockupTop - gapAboveLockup - textTop;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Base sizes scale off frame width so a higher-resolution plate set drops in
  // without retuning anything.
  const quoteBase = Math.round(W * 0.058);
  const attribBase = Math.round(W * 0.016);
  const gapBase = Math.round(H * 0.045);

  const buildBlocks = (scale) => {
    const blocks = [];

    const quoteSize = Math.max(14, Math.round(quoteBase * scale));
    ctx.font = `bold ${quoteSize}px ${DISPLAY_FONT}, Arial, sans-serif`;
    const segments = parseEmphasis(String(quote)).map((seg) => ({
      ...seg,
      text: seg.text.toUpperCase(),
    }));
    blocks.push({
      family: DISPLAY_FONT,
      size: quoteSize,
      weight: 'bold',
      color: '#e8e8e6',
      wrapped: wrapSegments(ctx, segments, maxTextW),
      // Bebas caps are short relative to the em, so tight leading is what makes
      // the block read as one dense mass rather than separated rows.
      lineH: Math.round(quoteSize * 0.92),
      gap: attribution ? Math.round(gapBase * scale) : 0,
    });

    if (attribution) {
      const attribSize = Math.max(11, Math.round(attribBase * scale));
      ctx.font = `normal ${attribSize}px ${TEXT_FONT}, Arial, sans-serif`;
      // En dash, not em. Never an em dash anywhere under Bart's name.
      const text = `– ${String(attribution).trim().toUpperCase()}`;
      blocks.push({
        family: TEXT_FONT,
        size: attribSize,
        weight: 'normal',
        color: '#c9c9c6',
        wrapped: wrapSegments(ctx, [{ text, accent: false }], maxTextW),
        lineH: Math.round(attribSize * 1.3),
        gap: 0,
      });
    }

    return blocks;
  };

  const heightOf = (bs) => bs.reduce((sum, b) => sum + b.wrapped.length * b.lineH + b.gap, 0);

  // Shrink only. The split layout grows short quotes to fill its panel, which is
  // right when the whole frame is being composed — but a plate is a finished
  // photograph, and growing type here pushed "SAME QUESTION." off the clear zone
  // and onto the subject's arm. On a plate the photograph sets the composition
  // and the type fits inside what is left.
  let scale = 1;
  let blocks = buildBlocks(scale);
  let totalH = heightOf(blocks);

  while (totalH > availableH && scale > 0.45) {
    scale = Math.max(0.45, scale * 0.95);
    blocks = buildBlocks(scale);
    totalH = heightOf(blocks);
  }

  let y = textTop + blocks[0].lineH;

  for (const b of blocks) {
    ctx.font = `${b.weight} ${b.size}px ${b.family}, Arial, sans-serif`;
    for (const segs of b.wrapped) {
      let x = textX;
      for (const seg of segs) {
        ctx.fillStyle = seg.accent ? accent : b.color;
        ctx.fillText(seg.text, x, y);
        x += ctx.measureText(seg.text).width;
      }
      y += b.lineH;
    }
    y += b.gap;
  }

  return canvas.toBuffer('image/png');
}
