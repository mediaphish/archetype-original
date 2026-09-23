/**
 * @jest-environment node
 *
 * Hybrid retrieval: meaning plus the words Bart actually wrote.
 *
 * 2026-09-23, measured against questions from real Auto sessions: asking about
 * "selective accountability" did not surface Power vs Authority Part 2, the post
 * that names and defines it. Its best passage scored 0.399 against a 0.4 floor.
 */
import { keyPhrasesFrom, mergeHits } from '../ao/corpusHybridRank.js';

describe('keyPhrasesFrom', () => {
  it('pulls the distinctive phrase out of a real question', () => {
    const phrases = keyPhrasesFrom('leaders who exempt favorites from the standard, selective accountability');
    expect(phrases).toContain('selective accountability');
  });

  it('drops filler so common words are never matched literally', () => {
    expect(keyPhrasesFrom('what is the leadership of a leader')).toEqual([]);
  });

  it('returns nothing for an empty question', () => {
    expect(keyPhrasesFrom('')).toEqual([]);
    expect(keyPhrasesFrom(null)).toEqual([]);
  });

  it('keeps at most three phrases, longest first', () => {
    const phrases = keyPhrasesFrom('selective accountability, psychological safety, organizational drift, executive presence');
    expect(phrases.length).toBeLessThanOrEqual(3);
    expect(phrases[0].length).toBeGreaterThanOrEqual(phrases[phrases.length - 1].length);
  });
});

describe('mergeHits', () => {
  const semantic = Array.from({ length: 8 }, (_, i) => ({
    slug: `semantic-${i}`,
    chunk_index: 0,
    doc_type: 'journal-post',
    similarity: 0.5 - i * 0.01,
  }));
  const lexical = [
    { slug: 'power-vs-authority-part-2-the-build', chunk_index: 4, doc_type: 'journal-post', similarity: 0.42 },
  ];

  it('keeps a literal match even when semantic hits fill the type quota', () => {
    const out = mergeHits(semantic, lexical, { maxResults: 30, maxPerDoc: 3, maxPerType: 8 });
    expect(out.map((h) => h.slug)).toContain('power-vs-authority-part-2-the-build');
  });

  it('still honours the per-document cap', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      slug: 'one-post',
      chunk_index: i,
      doc_type: 'journal-post',
      similarity: 0.5,
    }));
    const out = mergeHits(many, [], { maxResults: 30, maxPerDoc: 3, maxPerType: 8 });
    expect(out).toHaveLength(3);
  });

  it('never returns more than asked for', () => {
    const out = mergeHits(semantic, lexical, { maxResults: 4, maxPerDoc: 3, maxPerType: 8 });
    expect(out).toHaveLength(4);
  });

  it('leaves the result semantic when nothing matched literally', () => {
    const out = mergeHits(semantic, [], { maxResults: 30, maxPerDoc: 3, maxPerType: 8 });
    expect(out.map((h) => h.slug)).toEqual(semantic.map((h) => h.slug));
  });
});
