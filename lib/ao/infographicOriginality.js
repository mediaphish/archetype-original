/**
 * Our infographics never borrow wording from the ones Bart shared as examples.
 *
 * Bart, 2026-10-25: "We're not just ripping off the ones I'm giving you to show
 * the concept are we? That would be bad." Then: "Make that hard rule once we
 * hand off to Auto."
 *
 * The examples are design inspiration only (notes/reference-images/). Their
 * words are written down in data/infographicReferenceText.js so this check
 * can compare against them; that file is never shown to the writer. A graphic
 * or caption that shares a run of four words with an example, or uses one of
 * their headings as its own, goes back to the writer, and after three tries it
 * is refused instead of reaching the Queue. Wording that is in Bart's own piece
 * is his, and always allowed.
 */
import { REFERENCE_TEXT } from './data/infographicReferenceText.js';

const STOP = new Set(
  'a an and are as at be been but by can do for from has have how i if in into is it its me more my not of on or our so than that the their them then there they this to up us was we what when where which who why will with you your'.split(' ')
);

export function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Runs of four words with at least two that carry meaning. */
function runs(list, n = 4) {
  const out = [];
  for (let i = 0; i + n <= list.length; i += 1) {
    const run = list.slice(i, i + n);
    if (run.filter((w) => !STOP.has(w)).length >= 2) out.push(run.join(' '));
  }
  return out;
}

const headingKey = (text) => words(text).filter((w) => w !== 'the' && w !== 'a' && w !== 'your').join(' ');

let REF = null;
function reference() {
  if (REF) return REF;
  const data = REFERENCE_TEXT;
  const all = [...data.lines, ...data.headings];
  REF = {
    runs: new Set(all.flatMap((t) => runs(words(t)))),
    // A heading only counts when it has two or more words: "the mentor" alone is too common to own.
    headings: new Set(data.headings.map(headingKey).filter((k) => k.split(' ').length >= 2)),
  };
  return REF;
}

/** The short labels on a graphic, where a borrowed heading would show. */
function labelsOf(graphic) {
  const g = graphic || {};
  return [g.kicker, g.title, g.left_label, g.right_label, ...(g.columns || []), ...(g.items || []).map((it) => it?.name)].filter(Boolean);
}

/**
 * Pure: our lines that borrow an example's wording, or []. Wording that also
 * appears in Bart's piece is allowed: it is his.
 * @param {{ graphic: object, caption?: string, caption_x?: string, source?: string }} input
 * @returns {string[]} our lines that need rewriting
 */
export function borrowedLines({ graphic, caption = '', caption_x = '', source = '' }) {
  const ref = reference();
  const own = words(source).join(' ');
  const lines = [];
  const walk = (v) => {
    if (typeof v === 'string') lines.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => k !== 'layout' && walk(x));
  };
  walk(graphic);
  lines.push(...String(caption || '').split(/(?<=[.!?])\s+|\n+/), ...String(caption_x || '').split(/(?<=[.!?])\s+|\n+/));
  const flagged = new Set();
  for (const line of lines.filter((l) => String(l).trim())) {
    const hit = runs(words(line)).some((r) => ref.runs.has(r) && !own.includes(r));
    if (hit) flagged.add(String(line).trim());
  }
  for (const label of labelsOf(graphic)) {
    const key = headingKey(label);
    if (ref.headings.has(key) && !own.includes(key)) flagged.add(String(label).trim());
  }
  return [...flagged];
}

/**
 * The second check, for what a word match cannot see: a line reworded from an
 * example, or a graphic that follows one example's list point for point. A
 * separate reader compares the finished graphic with the examples' wording;
 * the writer never sees the examples. If the reader cannot run, the graphic
 * goes on (the word check above still applied) and the log says so.
 * @returns {Promise<string[]>} our lines that need rewriting
 */
export async function judgeBorrowed({ graphic, caption = '', source = '' }, { complete, timeoutMs = 45000 } = {}) {
  const ask = complete || (await import('./textModel.js')).completeJson;
  const data = REFERENCE_TEXT;
  const ours = { ...graphic };
  delete ours.layout;
  const prompt = `You check that a new leadership infographic is original. Below are the words from other people's infographics, and then the new one, which was written from Bart Paden's own article.

Flag a line of the new graphic only when it:
- rewords a specific line or heading from the other infographics (the same point, made the same way, with a few words swapped), or
- is part of a list that follows one of the other infographics item by item.
Do not flag ideas that are common to all leadership writing, and do not flag anything that is clearly said in Bart's article.

THE OTHER INFOGRAPHICS:
${[...data.headings, ...data.lines].join('\n')}

BART'S ARTICLE (excerpt):
${String(source || '').slice(0, 6000)}

THE NEW GRAPHIC:
${JSON.stringify(ours, null, 1)}
Caption: ${String(caption || '').slice(0, 1500)}

Return JSON only: { "borrowed": [ { "ours": "the new graphic's line, copied exactly", "why": "which line of theirs it follows" } ] } and an empty list when nothing is borrowed.`;
  try {
    const raw = await ask({ prompt, task: 'analysis', effort: 'low', maxTokens: 3000, timeoutMs });
    const list = Array.isArray(raw?.borrowed) ? raw.borrowed : [];
    return list.map((b) => String(b?.ours || '').trim()).filter(Boolean);
  } catch (err) {
    console.warn('[infographic] originality reader did not run:', err?.message || err);
    return [];
  }
}
