/**
 * Rough visible-character count after stripping scripts/styles/tags (for hollow-page detection).
 */

export function approxVisibleBodyText(html) {
  const bm = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let chunk = bm ? bm[1] : html;
  chunk = chunk.replace(/<script[\s\S]*?<\/script>/gi, '');
  chunk = chunk.replace(/<style[\s\S]*?<\/style>/gi, '');
  chunk = chunk.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  chunk = chunk.replace(/<[^>]+>/g, ' ');
  return chunk.replace(/\s+/g, ' ').trim().length;
}

/** `/journal/{slug}` — static HTML from generate-static-journal-html (not listing `/journal`). */
export function isJournalPostPath(pathname) {
  return /^\/journal\/.+/.test(pathname);
}
