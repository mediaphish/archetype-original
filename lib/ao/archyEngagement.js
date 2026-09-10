/**
 * Pure helpers for the Archy funnel endpoint.
 *
 * Extracted from api/chat/engagement.js for the same reason lib/ao/cardText.js
 * was extracted from the card renderer: the endpoint imports supabase-admin,
 * which builds a client at module load and throws without credentials, so
 * anything importing it is untestable. The rules below are the part worth
 * testing and they need no database.
 */

/** The five funnel events, in the order a visit moves through them. */
export const ARCHY_EVENTS = Object.freeze([
  'shown',
  'opened',
  'prompt_clicked',
  'asked',
  'closed',
]);

const EVENT_SET = new Set(ARCHY_EVENTS);

export function isArchyEvent(value) {
  return EVENT_SET.has(String(value ?? '').trim());
}

/**
 * Reduce a client-supplied path to something safe to store.
 *
 * Two jobs. Query strings fragment one page into many rows and carry campaign
 * and referrer detail nobody asked to store, so they go. And the value arrives
 * from the browser, so anything that is not an absolute same-origin path is
 * refused rather than written.
 */
export function cleanPath(value) {
  const raw = String(value ?? '').trim();
  if (!raw.startsWith('/')) return null;
  return raw.split('?')[0].split('#')[0].slice(0, 300);
}

/**
 * Which kind of page this was, so the funnel can be read by surface.
 *
 * A reader finishing a devotional and a prospect on /consulting are different
 * visits, and averaging them is what makes a single conversion number useless.
 *
 * Order matters: /journal must be matched before the /journal/ prefix, or the
 * listing page is counted as a post and inflates the denominator for the pages
 * search actually sends people to.
 */
export function pageTypeOf(path) {
  if (!path) return null;
  if (path === '/journal') return 'journal-index';
  if (path.startsWith('/journal/')) return 'journal-post';
  if (path.startsWith('/faqs')) return 'faq';
  if (path.startsWith('/culture-science')) return 'culture-science';
  if (path.startsWith('/fractional-roles')) return 'fractional-roles';
  if (path === '/') return 'home';
  return 'other';
}
