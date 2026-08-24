/**
 * Render a quote onto a plate and upload it, returning a postable URL.
 *
 * Split from generatePlateCard.js on purpose. That file is pure typesetting and
 * runs without credentials; this one is the side that talks to storage. Keeping
 * them apart is what stopped a missing SUPABASE_URL from breaking the ability to
 * measure a glyph.
 *
 * Plate selection lives here rather than in the renderer because "which plate"
 * is a question about what was posted recently, and that history is in storage.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { listPlates, renderPlateCard, choosePlate } from './generatePlateCard.js';

// Re-exported so callers have one import for the card pipeline. The definition
// lives in the pure module so it can be tested without credentials.
export { choosePlate };

const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

/** Filenames carry the plate they used, so history is readable without a table. */
const PLATE_FILENAME = /^plate-(.+?)-\d+\.png$/;

/**
 * Which plates were used most recently, newest first.
 *
 * Read back off the storage listing rather than tracked in a column. One less
 * migration, and it cannot drift out of sync with what was actually posted.
 * Returns an empty list on any failure — rotation is a nicety, and a storage
 * hiccup should not stop a card being made.
 */
export async function recentlyUsedPlates(limit = 6) {
  try {
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(STORAGE_PREFIX, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error || !Array.isArray(data)) return [];

    const used = [];
    for (const file of data) {
      const m = PLATE_FILENAME.exec(file.name || '');
      if (m && !used.includes(m[1])) used.push(m[1]);
      if (used.length >= limit) break;
    }
    return used;
  } catch {
    return [];
  }
}

/**
 * Make a postable card.
 *
 * @param {object} opts
 * @param {string}  opts.quote        Quote text. Wrap the phrase that carries the argument in *asterisks* for the brand red.
 * @param {string} [opts.attribution] Credit line without the dash, e.g. 'Gallup, 2026'.
 * @param {string} [opts.plate]       Force a specific plate. Omit to rotate.
 * @param {number} [opts.scrim]       Left/right darkening for a lighter plate. 0 by default.
 */
export async function publishPlateCard({ quote, attribution = '', plate = null, scrim = 0 } = {}) {
  const available = listPlates();
  if (!available.length) {
    return { ok: false, error: 'No plates available in public/images/cards.' };
  }

  let chosen = plate;
  if (chosen && !available.includes(chosen)) {
    // Accept a bare name so callers do not have to know the extension, which
    // changed once already when the library moved from PNG to JPEG.
    const match = available.find((n) => n.replace(/\.[^.]+$/, '') === String(chosen).replace(/\.[^.]+$/, ''));
    if (!match) {
      return { ok: false, error: `Plate not found: ${chosen}. Available: ${available.join(', ')}` };
    }
    chosen = match;
  }
  if (!chosen) chosen = choosePlate(available, await recentlyUsedPlates());

  let buffer;
  try {
    buffer = await renderPlateCard({ plate: chosen, quote, attribution, scrim });
  } catch (err) {
    return { ok: false, stage: 'render', error: err?.message || 'Plate render failed' };
  }

  const base = chosen.replace(/\.[^.]+$/, '');
  const filename = `plate-${base}-${Date.now()}.png`;
  const storagePath = `${STORAGE_PREFIX}/${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });
  if (uploadError) {
    return { ok: false, stage: 'upload', error: `Storage upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const image_url = urlData?.publicUrl;
  if (!image_url) {
    return { ok: false, stage: 'upload', error: 'Card uploaded but no public URL was returned.' };
  }

  return { ok: true, image_url, path: storagePath, filename, plate: chosen };
}
