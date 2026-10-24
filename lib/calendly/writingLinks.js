/**
 * Bart's own action items, matched to what he has already written.
 *
 * Bart, 2026-10-24 (from the CRM list he asked to have built): when he tells
 * someone "I'll send you the piece about the room", Auto finds that piece in
 * his published writing and puts the link beside the action item, ready to
 * paste. Suggestions only; nothing is sent.
 *
 * Search is semantic over the corpus passages. A short Claude pass then
 * decides which hits actually answer the promise, because "the piece about the
 * room" can match ten things about rooms. Only published, public pages are
 * offered: drafts, FAQs and anything with no page of its own are left out.
 */

import { searchCorpusChunks, groupChunksByDocument } from '../ao/corpusChunks.js';
import { toSourceUrl } from '../ao/corpusPullQuotes.js';
import { completeJson } from '../ao/textModel.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';
const LINKABLE_TYPES = new Set(['journal-post', 'devotional', 'chapter', 'preface', 'book', 'article']);

let published = null;
let publishedAt = 0;

/** Books and chapters are marked "final" rather than "published"; they have pages too. */
function isLive(d, today) {
  const status = d.status || 'published';
  const bookPart = ['book', 'chapter', 'preface'].includes(d.type);
  if (status !== 'published' && !(bookPart && status === 'final')) return false;
  return !d.publish_date || String(d.publish_date).slice(0, 10) <= today;
}

/** The page for a piece, or null when it has no page of its own. */
export function pageFor(doc) {
  if (doc.type === 'book' && doc.slug === 'the-room') return `${SITE}/the-room`;
  return toSourceUrl(doc.slug, doc.type, doc);
}

/** Pieces that are live on the site today, by slug, read from the site's own content list. */
export async function publishedSlugs({ fetchImpl = fetch, now = Date.now() } = {}) {
  if (published && now - publishedAt < 30 * 60 * 1000) return published;
  try {
    const res = await fetchImpl(`${SITE}/knowledge.json`);
    const data = await res.json();
    const today = new Date(now).toISOString().slice(0, 10);
    published = new Map((data.docs || []).filter((d) => isLive(d, today)).map((d) => [d.slug, d]));
    publishedAt = now;
  } catch (err) {
    console.error('[writingLinks] could not read the published list:', err?.message || err);
    if (!published) return null;
  }
  return published;
}

/** Hits that can be offered as a link: a real page, live today. */
export function linkableCandidates(docs, live) {
  const out = [];
  for (const d of docs) {
    if (!LINKABLE_TYPES.has(String(d.doc_type || '').toLowerCase())) continue;
    const doc = live?.get(d.slug);
    if (!doc) continue;
    const url = pageFor(doc);
    if (!url) continue;
    out.push({
      slug: d.slug,
      title: d.title,
      url,
      summary: String(d.summary || '').slice(0, 300),
      passage: String(d.passages?.[0]?.content || '').slice(0, 500),
    });
  }
  return out;
}

export function pickPrompt(items, candidatesByItem) {
  const blocks = items
    .map((item, i) => {
      const cands = candidatesByItem[i]
        .map((c, j) => `  [${j + 1}] ${c.title} (${c.slug})\n      ${c.summary || c.passage}`)
        .join('\n');
      return `Item ${i + 1}: "${item}"\nCandidates:\n${cands || '  none'}`;
    })
    .join('\n\n');
  return `Bart Paden made these promises to someone he advises. For each, decide whether one of his own published pieces is what he meant to send or would clearly help him keep the promise.

${blocks}

Return JSON: { "items": [ { "n": 1, "picks": [ { "slug": "...", "why": "One short sentence for Bart on why this fits." } ] } ] }
Rules:
- Pick at most two per item, and only when the piece truly fits. An empty list is the right answer when nothing does, or when the promise is not about sending something to read (an introduction, a call, a favor).
- Only slugs from that item's candidates. No em dashes.`;
}

/**
 * For each of Bart's action items, up to two published pieces with a reason.
 * @returns {Promise<Array<{ item: string, links: Array<{ title, url, why }> }>>}
 */
export async function linkBartItems(items, { search = searchCorpusChunks, pick = completeJson, live = undefined } = {}) {
  const list = (items || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8);
  if (!list.length) return [];
  const liveSlugs = live === undefined ? await publishedSlugs() : live;
  const candidatesByItem = [];
  for (const item of list) {
    const hits = await search(item, { maxResults: 16, maxPerDoc: 1 });
    candidatesByItem.push(linkableCandidates(groupChunksByDocument(hits), liveSlugs).slice(0, 6));
  }
  if (!candidatesByItem.some((c) => c.length)) return list.map((item) => ({ item, links: [] }));

  const parsed = await pick({ prompt: pickPrompt(list, candidatesByItem), task: 'analysis', maxTokens: 4000 });
  const byN = new Map((Array.isArray(parsed?.items) ? parsed.items : []).map((x) => [Number(x.n), x.picks]));
  return list.map((item, i) => {
    const cands = candidatesByItem[i];
    const picks = Array.isArray(byN.get(i + 1)) ? byN.get(i + 1) : [];
    const links = picks
      .map((p) => {
        const c = cands.find((x) => x.slug === p?.slug);
        return c ? { title: c.title, url: c.url, why: String(p.why || '').replace(/—/g, ',').trim() } : null;
      })
      .filter(Boolean)
      .slice(0, 2);
    return { item, links };
  });
}
