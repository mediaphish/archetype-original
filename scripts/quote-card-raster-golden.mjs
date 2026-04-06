#!/usr/bin/env node
/**
 * CI guard: quote-card SVG rasterizes to 1080 PNG with valid signature (same path as production).
 */
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import {
  rasterizeQuoteCardSvgToPngBuffer,
  QUOTE_CARD_OUTPUT_SIZE,
} from '../lib/ao/quoteCardRasterize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const fixturePath = join(root, 'tests/fixtures/quote-card-minimal.svg');

const svg = await readFile(fixturePath, 'utf8');
const r = await rasterizeQuoteCardSvgToPngBuffer(svg);
if (!r.ok) {
  console.error('Raster failed:', r.error);
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
  console.error(`Expected ${QUOTE_CARD_OUTPUT_SIZE}x${QUOTE_CARD_OUTPUT_SIZE}, got ${meta.width}x${meta.height}`);
  process.exit(1);
}
console.log('quote-card-raster-golden: ok');
