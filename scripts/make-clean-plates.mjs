/**
 * Make the logo-free plates the card maker draws on (2026-10-28).
 *
 * Bart: the cards were "using my logo wrong ... It cannot deviate. It cannot
 * interpret. It cannot modify the SVG." The lockup printed into every shot
 * plate (public/images/cards) is a redrawn copy with the top of the A
 * flattened. This removes that printed lockup once, writes the clean plate to
 * public/images/cards-clean, and records where the lockup sat in
 * lib/ao/plateLockups.json. generatePlateCard then stamps the real lockup
 * (public/brand/archetype-original-lockup.svg) in that spot on every card.
 *
 * Each result was checked by eye. variation_04 is left out: its lockup sits on
 * textured stone and every removal left a visible patch.
 *
 *   node scripts/make-clean-plates.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SRC = path.join(process.cwd(), 'public', 'images', 'cards');
const OUT = path.join(process.cwd(), 'public', 'images', 'cards-clean');
const BOXES = path.join(process.cwd(), 'lib', 'ao', 'plateLockups.json');
const SKIP = new Set(['variation_04']);
// The white shirt on 03 outweighs its small lockup, so its side is given.
const SIDE = { variation_03: 'left' };

fs.mkdirSync(OUT, { recursive: true });
const boxes = {};
for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith('.jpg')).sort()) {
  const base = f.replace(/\.jpg$/, '');
  if (SKIP.has(base)) continue;
  const { data, info } = await sharp(path.join(SRC, f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const ink = (x, y) => {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return 0.299 * r + 0.587 * g + 0.114 * b > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
  };
  let best = null;
  for (const side of SIDE[base] ? [SIDE[base]] : ['left', 'right']) {
    const [xa, xb] = side === 'left' ? [0, Math.floor(W * 0.25)] : [Math.floor(W * 0.75), W];
    let x0 = W, x1 = -1, y0 = H, y1 = -1, n = 0;
    for (let y = Math.floor(H * 0.72); y < H; y++) {
      for (let x = xa; x < xb; x++) {
        if (!ink(x, y)) continue;
        n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    if (!best || n > best.n) best = { side, x0, x1, y0, y1, n };
  }
  // Fill a padded box by blending its four edges inward, with a little grain.
  const P = 16;
  const bx0 = Math.max(0, best.x0 - P), bx1 = Math.min(W - 1, best.x1 + P);
  const by0 = Math.max(0, best.y0 - P), by1 = Math.min(H - 1, best.y1 + P);
  const px = (x, y, c) => data[(y * W + x) * C + c];
  const out = Buffer.from(data);
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const tx = (x - bx0) / (bx1 - bx0), ty = (y - by0) / (by1 - by0);
      const wh = Math.min(tx, 1 - tx), wv = Math.min(ty, 1 - ty);
      for (let c = 0; c < 3; c++) {
        const h = px(bx0, y, c) * (1 - tx) + px(bx1, y, c) * tx;
        const v = px(x, by0, c) * (1 - ty) + px(x, by1, c) * ty;
        const val = (h * wv + v * wh) / (wh + wv || 1) + (Math.random() - 0.5) * 4;
        out[(y * W + x) * C + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).jpeg({ quality: 92 }).toFile(path.join(OUT, f));
  boxes[base] = { side: best.side, x: best.x0, y: best.y0, w: best.x1 - best.x0 + 1, h: best.y1 - best.y0 + 1 };
  console.log(f, JSON.stringify(boxes[base]));
}
fs.writeFileSync(BOXES, `${JSON.stringify(boxes, null, 2)}\n`);
