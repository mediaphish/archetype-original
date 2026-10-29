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
import { quoteIsBartsOwn } from './quoteSource.js';
import { BACKGROUNDS, backgroundFile, chooseBackgroundFor } from './reshareBackgrounds.js';
import path from 'path';

// Re-exported so callers have one import for the card pipeline. The definition
// lives in the pure module so it can be tested without credentials.
export { choosePlate };

const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

/** Filenames carry the plate they used, so history is readable without a table. */
const PLATE_FILENAME = /^plate-(.+?)-\d+\.png$/;
const SERIES_FILENAME = /^series-(bart-reshare-\d{3})-\d+\.png$/;

/** The series photos used most recently, newest first, read off the storage listing. */
export async function recentlyUsedSeries(limit = 10) {
  try {
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(STORAGE_PREFIX, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error || !Array.isArray(data)) return [];
    const used = [];
    for (const file of data) {
      const m = SERIES_FILENAME.exec(file.name || '');
      if (m && !used.includes(m[1])) used.push(m[1]);
      if (used.length >= limit) break;
    }
    return used;
  } catch {
    return [];
  }
}

async function uploadCard(buffer, filename) {
  const storagePath = `${STORAGE_PREFIX}/${filename}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });
  if (uploadError) return { ok: false, stage: 'upload', error: `Storage upload failed: ${uploadError.message}` };
  const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!urlData?.publicUrl) return { ok: false, stage: 'upload', error: 'Card uploaded but no public URL was returned.' };
  return { ok: true, image_url: urlData.publicUrl, path: storagePath, filename };
}

/**
 * A card of Bart's own words on one of his 20 series photos.
 *
 * Bart, 2026-10-29: "Auto is completely ignoring the 20+ images I uploaded for
 * the resurface posts. It's generating it's own." His cards were going on the
 * August plates (him seated, same head angle, the tan and brown jackets), not
 * on the series he made for these posts (lib/ao/reshareBackgrounds.js). Now a
 * card credited to him goes on a series photo whose mood fits the quote, drawn
 * exactly as he made it, with the type and logo added on its open side.
 */
async function publishSeriesCard(quote) {
  const background = await chooseBackgroundFor({ quote, recentIds: await recentlyUsedSeries() });
  const { composeReshareInBartStyle } = await import('./generateReshareCardImage.js');
  const composed = await composeReshareInBartStyle({
    backgroundPath: path.join(process.cwd(), backgroundFile(background.id)),
    textSide: background.text,
    pullQuote: String(quote).replace(/\*/g, ''),
  });
  if (!composed?.ok || !composed.buffer) return { ok: false, stage: 'render', error: composed?.error || 'Card render failed' };
  const up = await uploadCard(composed.buffer, `series-${background.id}-${Date.now()}.png`);
  return up.ok ? { ...up, plate: background.id } : up;
}

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
  // A card credited to Bart prints his own sentence, word for word (2026-10-28).
  // Cards run without his review, so this is the check his review used to be.
  // Quotes credited to anyone else (a study, a survey) are not his writing and skip it.
  if (!attribution || /bart\s+paden/i.test(attribution)) {
    const own = await quoteIsBartsOwn(quote);
    if (!own.ok) {
      return { ok: false, stage: 'quote', error: `Not made: ${own.reason}. A card credited to Bart must print a sentence he wrote, exactly as he wrote it.` };
    }
  }

  // Bart's own words always go on his series photos, even when a plate is named.
  const credited = !attribution || /bart\s+paden/i.test(attribution);
  if (credited && BACKGROUNDS.length) return publishSeriesCard(quote);

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
