/**
 * Resolve public href for a corpus connection on the episode page.
 */

export function resolveCorpusConnectionHref(conn) {
  const type = String(conn?.type || '').trim();
  const slug = String(conn?.slug || '').trim();
  if (!slug) return null;

  if (type === 'episode') return `/podcast/${slug}`;
  if (type === 'journal_post') return `/journal/${slug}`;
  if (type === 'ali_condition') {
    if (slug.startsWith('ali-') || slug.includes('leadership-condition')) {
      return `/culture-science/ali/${slug}`;
    }
    return `/journal/${slug}`;
  }
  if (type === 'book_chapter') {
    if (slug.includes('remaining-human')) return '/remaining-human';
    return '/accidental-ceo';
  }

  return `/journal/${slug}`;
}

export function timestampToSeconds(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parts = raw.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
