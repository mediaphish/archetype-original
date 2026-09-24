/**
 * Does the draft keep moving, or does it restate itself?
 *
 * 2026-09-24, The Jonathan Archetype: one proposition was stated seven times
 * ("he had a legitimate claim, nobody forced him, he yielded to a decision made
 * above his own authority"), and three sections closed on nearly the same
 * paragraph. Bart read 3,200 words to find it: "It reads very much like a loop
 * that repeats itself."
 *
 * It is not about length. Bart: "If it needs to have the space to tell the
 * story, it's fine. This one it didn't." So nothing here counts words.
 *
 * Word matching was tried first and thrown away: the repetition is the same
 * idea in fresh wording, so overlap scored Bart's published posts as badly as
 * the bad draft. Paragraphs are compared by meaning instead.
 *
 * Thresholds measured 2026-09-24 over the bad draft and six published posts,
 * comparing every non-adjacent paragraph pair:
 *
 *   The Jonathan draft      4 pairs at 0.75 or above   (top 0.781, 0.776)
 *   The Daniel Archetype    1
 *   The Jezebel Archetype   1
 *   The Cain Archetype      0
 *   The Account Under Fire  0
 *   Unity Is Not Sameness   0
 *   Twenty Points Apart     0
 *
 * So three pairs is the line. One echo is writing; four is a loop. Advisory
 * only: it tells Auto, Auto fixes it before Bart ever reads it. A check that
 * refuses to save is how the caption gate turned into an argument.
 */

export const PAIR_THRESHOLD = 0.75;
export const FLAG_AT_PAIRS = 3;
const MIN_PARAGRAPH_WORDS = 35;
const MIN_DRAFT_WORDS = 800;

/** Body paragraphs worth comparing: prose, not headings or one-liners. */
export function paragraphsForRepetition(markdown) {
  return String(markdown || '')
    .replace(/^---[\s\S]*?\n---\n/, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^#{1,6}\s/.test(p) &&
        !/^\*\*[^*]+\*\*$/.test(p) &&
        !/^[->*\d.]\s/.test(p) &&
        p.split(/\s+/).length >= MIN_PARAGRAPH_WORDS
    );
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (!aa || !bb) return 0;
  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

/**
 * Pairs of paragraphs saying the same thing, worst first.
 *
 * Adjacent paragraphs are skipped: a paragraph that builds on the one before it
 * is continuity, not repetition.
 */
export function findRepeatedPairs(embeddings, { threshold = PAIR_THRESHOLD, minGap = 2 } = {}) {
  const pairs = [];
  for (let i = 0; i < embeddings.length; i += 1) {
    for (let j = i + minGap; j < embeddings.length; j += 1) {
      if (!embeddings[i] || !embeddings[j]) continue;
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity >= threshold) pairs.push({ a: i, b: j, similarity });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity);
}

/** The note Auto gets back with its save, or null when the draft keeps moving. */
export function repetitionNote(pairs, paragraphs, { flagAt = FLAG_AT_PAIRS } = {}) {
  if (!Array.isArray(pairs) || pairs.length < flagAt) return null;

  const lines = [
    `${pairs.length} pairs of paragraphs in this draft make the same point in different words. ` +
      'That is what reads as a loop. Say each point once, where it lands best, and let the other ' +
      'passages end on their own new material. This is not about length: a long piece is fine when ' +
      'it keeps moving. Fix it before showing Bart the draft.',
  ];

  for (const pair of pairs.slice(0, 3)) {
    const a = String(paragraphs[pair.a] || '').slice(0, 140);
    const b = String(paragraphs[pair.b] || '').slice(0, 140);
    lines.push(`- (${pair.similarity.toFixed(2)}) "${a}..."\n  and "${b}..."`);
  }

  return lines.join('\n');
}

/**
 * Embed the paragraphs and report what repeats. Returns null when the draft is
 * short, when embeddings are unavailable, or when nothing repeats.
 */
export async function checkDraftRepetition(markdown, { embed = null } = {}) {
  const body = String(markdown || '');
  if (body.split(/\s+/).length < MIN_DRAFT_WORDS) return null;

  const paragraphs = paragraphsForRepetition(body);
  if (paragraphs.length < 6) return null;

  let embedOne = embed;
  if (!embedOne) {
    const { generateEmbedding } = await import('./corpusEmbeddings.js');
    embedOne = (text) => generateEmbedding(text);
  }

  const embeddings = [];
  for (const paragraph of paragraphs) {
    embeddings.push(await embedOne(paragraph.slice(0, 4000)));
  }
  if (embeddings.every((e) => !e)) return null;

  const pairs = findRepeatedPairs(embeddings);
  const note = repetitionNote(pairs, paragraphs);
  return note ? { pairs, paragraphs, note } : null;
}
