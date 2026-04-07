#!/usr/bin/env node
/**
 * CI guard: minimal quote card renders to 1080 PNG with valid signature (canvas + bundled font).
 */
import sharp from 'sharp';
import { renderMinimalQuoteCardPngBuffer, QUOTE_CARD_CANVAS_SIZE } from '../lib/ao/quoteCardCanvasPng.js';
import { QUOTE_CARD_OUTPUT_SIZE } from '../lib/ao/quoteCardRasterize.js';

const r = await renderMinimalQuoteCardPngBuffer({
  quote: 'Raster golden fixture — quote card body text must be readable pixels, not tofu.',
  sourceName: 'Test',
});
if (!r.ok) {
  console.error('Canvas render failed:', r.error);
  process.exit(1);
}
const buf = r.buffer;
const b0 = buf[0];
const b1 = buf[1];
if (b0 !== 0x89 || b1 !== 0x50) {
  console.error('Output is not PNG');
  process.exit(1);
}
const meta = await sharp(buf).metadata();
if (meta.width !== QUOTE_CARD_OUTPUT_SIZE || meta.height !== QUOTE_CARD_OUTPUT_SIZE) {
  if (meta.width !== QUOTE_CARD_CANVAS_SIZE || meta.height !== QUOTE_CARD_CANVAS_SIZE) {
    console.error(`Expected ${QUOTE_CARD_OUTPUT_SIZE}x${QUOTE_CARD_OUTPUT_SIZE}, got ${meta.width}x${meta.height}`);
    process.exit(1);
  }
}
if (buf.length < 8000) {
  console.error('PNG suspiciously small — text may not have rendered');
  process.exit(1);
}
console.log('quote-card-raster-golden: ok');
