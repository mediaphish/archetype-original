/**
 * Checks that a card's quote is Bart's own sentence, and that a devotional is
 * linked where it lives (2026-10-28).
 *
 * Bart: "my goal is autonomy. This spot check that I'm doing right now is
 * literally just a spot check." Cards run without his approval, so what used
 * to rest on his review is enforced here instead:
 *
 *   - A card credited to Bart prints a sentence from his published (or approved) writing,
 *     word for word. Only case, quote marks, dashes and spacing may differ.
 *   - A devotional is linked at /faith?slug=..., never /journal/... ("they're
 *     not in the journal").
 */
import { loadKnowledgeDocs, isPullQuoteSourceDoc } from './corpusPullQuotes.js';

/** Pure: the text reduced to words, so formatting never decides a match. */
export function normalizeForMatch(text) {
  return String(text || '')
    .replace(/[*_#>`]/g, ' ')
    .replace(/[‘’‚‛']/g, '')
    .replace(/[“”„"]/g, '')
    .replace(/[–—-]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Pure: the published doc whose text contains the quote word for word, or null. */
export function findQuoteSource(quote, docs) {
  const q = normalizeForMatch(quote);
  if (q.split(' ').length < 4) return null;
  for (const d of docs || []) {
    if (normalizeForMatch(`${d.body || ''} ${d.summary || ''}`).includes(q)) return d;
  }
  return null;
}

/** Posts Bart approved that have not reached the corpus yet, e.g. one publishing next week. */
async function approvedDrafts() {
  try {
    const { contentDrafts } = await import('../db/contentDrafts.js');
    const { data } = await contentDrafts()
      .select('slug, title, kind, content')
      .in('kind', ['journal', 'devotional'])
      .not('approved_at', 'is', null)
      .limit(500);
    return (data || []).map((d) => ({ slug: d.slug, title: d.title, type: d.kind, body: d.content }));
  } catch {
    return [];
  }
}

/** Whether the quote is in Bart's published or approved writing. Never throws. */
export async function quoteIsBartsOwn(quote) {
  const docs = await loadKnowledgeDocs();
  // With no corpus to check against, nothing can be confirmed, so nothing passes.
  if (!docs) return { ok: false, reason: 'his writing could not be loaded to check against' };
  const doc = findQuoteSource(quote, docs.filter(isPullQuoteSourceDoc)) || findQuoteSource(quote, await approvedDrafts());
  if (!doc) return { ok: false, reason: 'the line is not in his writing word for word' };
  return { ok: true, slug: doc.slug || null, title: doc.title || null, type: doc.type || null };
}

const SITE = 'https://www.archetypeoriginal.com';
const JOURNAL_LINK = /https:\/\/(?:www\.)?archetypeoriginal\.com\/journal\/([a-z0-9-]+)\/?/gi;

/** Pure: journal links to a devotional, pointed at the devotional page instead. */
export function fixDevotionalLinks(text, devotionalSlugs) {
  if (!text || !devotionalSlugs?.size) return text;
  return String(text).replace(JOURNAL_LINK, (whole, slug) =>
    devotionalSlugs.has(slug.toLowerCase()) ? `${SITE}/faith?slug=${slug.toLowerCase()}` : whole
  );
}

let slugCache = null;
/** Slugs of every devotional in the corpus. */
export async function devotionalSlugs() {
  if (slugCache) return slugCache;
  const docs = (await loadKnowledgeDocs()) || [];
  slugCache = new Set(docs.filter((d) => d.type === 'devotional' && d.slug).map((d) => String(d.slug).toLowerCase()));
  return slugCache;
}

/** A scheduled-post row with any devotional links corrected. */
export async function withDevotionalLinksFixed(row) {
  const slugs = await devotionalSlugs();
  const out = { ...row };
  for (const k of ['text', 'caption', 'first_comment']) {
    if (typeof out[k] === 'string') out[k] = fixDevotionalLinks(out[k], slugs);
  }
  return out;
}
