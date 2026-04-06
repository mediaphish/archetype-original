/**
 * Durable publish queue shape for Auto thread state (`publish_candidates`).
 * Each entry is one schedulable quote card built from corpus pull + captions.
 *
 * Fields: corpus_index (1-based), quote, source_title?, url?, caption, caption_x?, svg, image_url? (PNG URL matching server raster)
 */

/** @param {Record<string, unknown>} c */
export function normalizePublishCandidate(c) {
  if (!c || typeof c !== 'object') return null;
  const corpus_index = Number(c.corpus_index);
  if (!Number.isFinite(corpus_index) || corpus_index < 1) return null;
  const svg = String(c.svg || '').trim();
  if (!svg) return null;
  const image_url = String(c.image_url || '').trim();
  return {
    corpus_index,
    quote: String(c.quote || ''),
    source_title: String(c.source_title || ''),
    url: String(c.url || ''),
    caption: String(c.caption || ''),
    caption_x: String(c.caption_x || ''),
    svg,
    ...(image_url && /^https:\/\//i.test(image_url) ? { image_url } : {}),
  };
}
