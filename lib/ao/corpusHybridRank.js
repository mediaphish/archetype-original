/**
 * The ranking half of hybrid corpus retrieval, with no database attached.
 *
 * 2026-09-23, measured against questions taken from real Auto sessions: asking
 * about "selective accountability" did not surface Power vs Authority Part 2,
 * the post that names the term and defines it. Its best passage scored 0.399
 * against a 0.4 floor and sat nineteenth. Embeddings carry meaning and do not
 * reward an exact phrase, and dropping the floor instead pulls in the FAQ noise
 * that MAX_PER_TYPE exists to hold back.
 *
 * So distinctive phrases are matched as text as well, which is what a person
 * means by "I wrote about this". Kept apart from corpusChunks.js because that
 * module loads the Supabase client at import, which a unit test cannot do.
 */

/** Words too common to be worth matching literally. */
const STOPWORDS = new Set(
  ('a an and are as at be but by for from has have how i if in is it its of on or that the their them they this to was what when where which who why with you your ' +
    'about does do did can could should would leaders leader leadership')
    .split(' ')
);

/** The score a literal phrase match is worth. Deliberately at the usual floor. */
export const LEXICAL_SCORE = 0.42;

/** How many literal matches are guaranteed a place in the result set. */
export const LEXICAL_RESERVE = 3;

/**
 * A phrase earns a reserved slot only when it names something, rather than
 * describing a subject the corpus is largely about.
 *
 * 2026-09-28. Archy was asked what the Four-Survey Framework is and what the
 * boundaries of Culture Science are. The first half worked: "four-survey
 * framework" is in 2 chunks and the reserve put the right document first. The
 * second half extracted only "culture science", which is in 84 chunks, so three
 * of Archy's eight passage slots went to arbitrary chunks that merely contain
 * the words, and pushed out the section that actually answers the question.
 *
 * Measured over 1,776 chunks that day:
 *
 *   selective accountability     1     the case the reserve was built for
 *   four-survey framework        2
 *   psychological safety        67
 *   culture science             84
 *   servant leadership         279     a phrase the whole corpus is about
 *
 * One percent is the line, with a floor so a small corpus does not make every
 * phrase common. Above it the dense search is better at picking passages than
 * a substring match is, which is the whole reason the semantic pass leads.
 */
export const MAX_PHRASE_SHARE = 0.01;
export const MIN_PHRASE_ALLOWANCE = 12;

/** Is this phrase distinctive enough in a corpus this size to reserve a slot? */
export function isSelectivePhrase(matchCount, totalChunks) {
  const matches = Number(matchCount);
  const total = Number(totalChunks);
  if (!Number.isFinite(matches) || matches <= 0) return false;
  if (!Number.isFinite(total) || total <= 0) return true;
  return matches <= Math.max(MIN_PHRASE_ALLOWANCE, Math.floor(total * MAX_PHRASE_SHARE));
}

/**
 * Phrases from a question worth matching literally: two consecutive words that
 * are not filler, longest first, at most three.
 */
export function keyPhrasesFrom(queryText, { max = 3 } = {}) {
  const words = String(queryText || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const phrases = [];
  let run = [];
  for (const word of words) {
    if (STOPWORDS.has(word) || word.length < 3) {
      run = [];
      continue;
    }
    run.push(word);
    if (run.length >= 2) {
      const phrase = run.slice(-2).join(' ');
      if (phrase.length >= 12) phrases.push(phrase);
    }
  }
  return [...new Set(phrases)].sort((a, b) => b.length - a.length).slice(0, max);
}

/**
 * Merge the semantic and literal passes, then re-apply the caps the search
 * applies in SQL.
 *
 * Literal matches go first, up to LEXICAL_RESERVE. Sorting everything by score
 * put them last and the per-type cap dropped them entirely: the post naming
 * "selective accountability" still did not surface, because eight semantic
 * journal-post passages filled the type quota ahead of it. A phrase Bart wrote
 * is not a weak signal to be outvoted.
 */
export function mergeHits(semantic = [], lexical = [], { maxResults, maxPerDoc, maxPerType } = {}) {
  const perDoc = new Map();
  const perType = new Map();
  const out = [];

  const take = (hit) => {
    const docCount = perDoc.get(hit.slug) || 0;
    const typeCount = perType.get(hit.doc_type) || 0;
    if (docCount >= maxPerDoc || typeCount >= maxPerType) return;
    perDoc.set(hit.slug, docCount + 1);
    perType.set(hit.doc_type, typeCount + 1);
    out.push(hit);
  };

  for (const hit of lexical.slice(0, LEXICAL_RESERVE)) {
    if (out.length >= maxResults) break;
    take(hit);
  }

  for (const hit of [...semantic].sort((a, b) => (b.similarity || 0) - (a.similarity || 0))) {
    if (out.length >= maxResults) break;
    take(hit);
  }

  return out;
}
