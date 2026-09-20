/**
 * Resurface card: Bart's real photograph, with the pull quote set by the canvas.
 *
 * 2026-09-20. The old path put the quote in the image model's prompt and let it
 * letter the graphic; the result ran across Bart's face. The quote-card pipeline
 * states the rule this follows: "The image model paints and never letters; the
 * canvas sets every glyph and places the brand lockup as vector art."
 *
 * No model runs here at all. The photograph is Bart's own file, the type is set
 * by Skia, and the position comes from measuring the photo (resurfaceCardLayout).
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DISPLAY_FONT, ensureFont } from './cardText.js';
import { chooseTextZone, fitQuoteLines } from './resurfaceCardLayout.js';

const WIDTH = 1600;
const HEIGHT = 1200; // 4:3, the resurface convention
const PAD = 56;
const INK = '#f5f5f3';

/**
 * Per-tile brightness and detail for the photo.
 * Greyscale, downscaled: enough to tell a face from a wall, cheap to compute.
 */
export async function analyzePhotoTiles(buffer, { cols = 12, rows = 9 } = {}) {
  const sharp = (await import('sharp')).default;
  const w = cols * 16;
  const h = rows * 16;
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(w, h, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tileW = w / cols;
  const tileH = h / rows;
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let y = Math.floor(row * tileH); y < Math.floor((row + 1) * tileH); y += 1) {
        for (let x = Math.floor(col * tileW); x < Math.floor((col + 1) * tileW); x += 1) {
          const v = data[y * w + x];
          sum += v;
          sumSq += v * v;
          n += 1;
        }
      }
      const mean = n ? sum / n : 0;
      const variance = n ? Math.max(0, sumSq / n - mean * mean) : 0;
      tiles.push({ col, row, mean, stdev: Math.sqrt(variance) });
    }
  }
  return { tiles, cols, rows };
}

/** Draw the photo to fill the frame without distortion. */
function drawPhotoCover(ctx, img) {
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (WIDTH - dw) / 2, (HEIGHT - dh) / 2, dw, dh);
}

/**
 * Shading under the type, so the quote reads on any photo.
 *
 * It runs off the nearest frame edges and fades only where it meets the picture,
 * which reads as lighting rather than a grey box pasted on top. A hard-edged
 * rectangle was the first version and looked exactly like one.
 */
function drawScrim(ctx, box, zone) {
  // Full-frame gradients, never a panel. The first two versions drew a
  // rectangle: its edges were plainly visible, and on one photo the edge cut a
  // straight line down Bart's face. Gradients that run the whole frame darken
  // the corner the type sits in and reach zero before they meet him.
  const centreY = (box.y + box.h / 2) / HEIGHT;
  const centreX = (box.x + box.w / 2) / WIDTH;
  const fullWidth = zone.w > 0.7;

  const vertical = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (centreY < 0.5) {
    vertical.addColorStop(0, 'rgba(8,8,8,0.78)');
    vertical.addColorStop(Math.min(0.72, (box.y + box.h) / HEIGHT + 0.18), 'rgba(8,8,8,0)');
    vertical.addColorStop(1, 'rgba(8,8,8,0)');
  } else {
    vertical.addColorStop(0, 'rgba(8,8,8,0)');
    vertical.addColorStop(Math.max(0.28, box.y / HEIGHT - 0.18), 'rgba(8,8,8,0)');
    vertical.addColorStop(1, 'rgba(8,8,8,0.82)');
  }
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A side wash as well when the type occupies one side, so the far side of the
  // picture keeps its light.
  if (!fullWidth) {
    const horizontal = ctx.createLinearGradient(0, 0, WIDTH, 0);
    if (centreX < 0.5) {
      horizontal.addColorStop(0, 'rgba(8,8,8,0.55)');
      horizontal.addColorStop(Math.min(0.85, (box.x + box.w) / WIDTH + 0.16), 'rgba(8,8,8,0)');
      horizontal.addColorStop(1, 'rgba(8,8,8,0)');
    } else {
      horizontal.addColorStop(0, 'rgba(8,8,8,0)');
      horizontal.addColorStop(Math.max(0.15, box.x / WIDTH - 0.16), 'rgba(8,8,8,0)');
      horizontal.addColorStop(1, 'rgba(8,8,8,0.55)');
    }
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

async function loadLockup(height) {
  const svgPath = join(process.cwd(), 'public', 'brand', 'archetype-original-lockup.svg');
  if (existsSync(svgPath)) {
    try {
      const sharp = (await import('sharp')).default;
      // The lockup carries its colour in a CSS block (fill: #231f20), not only
      // in fill attributes. Missing that drew a near-black mark on a dark photo.
      const svg = readFileSync(svgPath, 'utf8')
        .replace(/fill:\s*#[0-9a-f]{3,8}/gi, `fill: ${INK}`)
        .replace(/fill="#[0-9a-f]{3,8}"/gi, `fill="${INK}"`);
      const png = await sharp(Buffer.from(svg)).resize({ height: Math.round(height) }).png().toBuffer();
      return await loadImage(png);
    } catch (err) {
      console.warn('[resurfaceCardImage] lockup render failed:', err?.message || err);
    }
  }
  const pngPath = join(process.cwd(), 'public', 'images', 'ao-logo-offwhite.png');
  if (existsSync(pngPath)) return loadImage(readFileSync(pngPath));
  return null;
}

/**
 * @param {{ photoBuffer: Buffer, quote: string }} opts
 * @returns {Promise<{ ok: true, buffer: Buffer, zone: string } | { ok: false, error: string }>}
 */
export async function renderResurfaceCardPngBuffer({ photoBuffer, quote } = {}) {
  const text = String(quote || '').trim().replace(/^["“”]|["“”]$/g, '');
  if (!text) return { ok: false, error: 'quote required' };
  if (!photoBuffer?.length) return { ok: false, error: 'photo required' };

  try {
    ensureFont();
  } catch (err) {
    return { ok: false, error: err?.message || 'font registration failed' };
  }

  let img;
  try {
    img = await loadImage(photoBuffer);
  } catch (err) {
    return { ok: false, error: `photo could not be read: ${err?.message || err}` };
  }

  const { tiles, cols, rows } = await analyzePhotoTiles(photoBuffer).catch(() => ({ tiles: [], cols: 12, rows: 9 }));
  const zone = chooseTextZone({ tiles, cols, rows });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPhotoCover(ctx, img);

  const box = {
    x: Math.round(zone.x * WIDTH),
    y: Math.round(zone.y * HEIGHT),
    w: Math.round(zone.w * WIDTH),
    h: Math.round(zone.h * HEIGHT),
  };

  // The lockup sits under the quote inside the same zone, so it never lands on
  // Bart either. Room is reserved for it before the type is fitted.
  const lockupHeight = 74;
  const textHeight = box.h - lockupHeight - 28;

  const measure = (line, size) => {
    ctx.font = `700 ${size}px ${DISPLAY_FONT}`;
    return ctx.measureText(line).width;
  };
  const { lines, fontSize, lineHeight } = fitQuoteLines({
    quote: text,
    zoneWidth: box.w,
    zoneHeight: textHeight,
    measure,
  });

  const blockHeight = lines.length * lineHeight;
  const startY = box.y + Math.max(0, Math.round((textHeight - blockHeight) / 2));
  drawScrim(ctx, { x: box.x, y: startY, w: box.w, h: blockHeight + lockupHeight + 28 }, zone);

  ctx.font = `700 ${fontSize}px ${DISPLAY_FONT}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, box.x, startY + i * lineHeight));

  const lockup = await loadLockup(lockupHeight);
  if (lockup) {
    const scale = lockupHeight / lockup.height;
    ctx.drawImage(lockup, box.x, startY + blockHeight + 28, lockup.width * scale, lockupHeight);
  }

  try {
    const buffer = await canvas.encode('png');
    if (!buffer?.length) return { ok: false, error: 'empty PNG buffer' };
    return { ok: true, buffer, zone: zone.id, fontSize, lines: lines.length };
  } catch (err) {
    return { ok: false, error: err?.message || 'encode failed' };
  }
}

/** Fetch a photo by URL, or read it from public/images for a /images/... path. */
export async function loadPhotoBuffer(photoUrl) {
  const raw = String(photoUrl || '').trim();
  if (!raw) return null;
  const localName = raw.startsWith('/images/') ? raw.slice('/images/'.length) : null;
  if (localName) {
    const p = join(process.cwd(), 'public', 'images', localName);
    return existsSync(p) ? readFileSync(p) : null;
  }
  const res = await fetch(raw);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/** Render and upload. Returns the public URL, like the other image tools. */
export async function generateResurfaceCard({ photoUrl, quote }) {
  const photoBuffer = await loadPhotoBuffer(photoUrl);
  if (!photoBuffer) return { ok: false, error: `Could not load the photo: ${photoUrl}` };

  const rendered = await renderResurfaceCardPngBuffer({ photoBuffer, quote });
  if (!rendered.ok) return rendered;

  const { supabaseAdmin } = await import('../supabase-admin.js');
  const filename = `resurface-${Date.now()}.png`;
  const storagePath = `ao-design-images/${filename}`;
  const { error } = await supabaseAdmin.storage
    .from('ao-auto-attachments')
    .upload(storagePath, rendered.buffer, { contentType: 'image/png', upsert: false });
  if (error) return { ok: false, error: `Storage upload failed: ${error.message}` };

  const { data } = supabaseAdmin.storage.from('ao-auto-attachments').getPublicUrl(storagePath);
  if (!data?.publicUrl) return { ok: false, error: 'Card uploaded but no public URL came back.' };

  return {
    ok: true,
    image_url: data.publicUrl,
    path: storagePath,
    zone: rendered.zone,
    photo_url: photoUrl,
    message:
      `Resurface card built from ${photoUrl} with the quote set by the canvas (zone: ${rendered.zone}). ` +
      'No image model lettered this, so the type cannot land on Bart.',
  };
}
