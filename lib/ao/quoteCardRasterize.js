/**
 * Shared SVG→PNG path for quote cards. Same options everywhere (preview upload, publish, tests).
 */

import sharp from 'sharp';

/** @type {const} */
export const QUOTE_CARD_SVG_DENSITY = 144;

/** @type {const} */
export const QUOTE_CARD_OUTPUT_SIZE = 1080;

/**
 * @param {string} svgString
 * @returns {Promise<{ ok: true, buffer: Buffer } | { ok: false, error: string }>}
 */
export async function rasterizeQuoteCardSvgToPngBuffer(svgString) {
  if (!svgString || typeof svgString !== 'string' || svgString.length < 20) {
    return { ok: false, error: 'Invalid or empty SVG' };
  }
  try {
    const png = await sharp(Buffer.from(svgString, 'utf8'), { density: QUOTE_CARD_SVG_DENSITY })
      .resize(QUOTE_CARD_OUTPUT_SIZE, QUOTE_CARD_OUTPUT_SIZE, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    if (!png?.length) {
      return { ok: false, error: 'Empty PNG buffer' };
    }
    return { ok: true, buffer: png };
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not rasterize quote card' };
  }
}
