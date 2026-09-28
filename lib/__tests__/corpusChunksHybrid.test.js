/**
 * @jest-environment node
 *
 * Hybrid retrieval: meaning plus the words Bart actually wrote.
 *
 * 2026-09-23, measured against questions from real Auto sessions: asking about
 * "selective accountability" did not surface Power vs Authority Part 2, the post
 * that names and defines it. Its best passage scored 0.399 against a 0.4 floor.
 */
import {
  keyPhrasesFrom,
  mergeHits,
  isSelectivePhrase,
  MAX_PHRASE_SHARE,
  MIN_PHRASE_ALLOWANCE,
} from '../ao/corpusHybridRank.js';

/**
 * 2026-09-28. Real counts over the 1,776 chunk corpus, the day Archy spent
 * three of its eight passage slots on chunks that merely contained the words
 * "culture science".
 */
describe('isSelectivePhrase', () => {
  const TOTAL = 1776;

  it('reserves a slot for a phrase that names something', () => {
    expect(isSelectivePhrase(1, TOTAL)).toBe(true); // selective accountability
    expect(isSelectivePhrase(2, TOTAL)).toBe(true); // four-survey framework
  });

  it('refuses a phrase the corpus is broadly about', () => {
    expect(isSelectivePhrase(67, TOTAL)).toBe(false); // psychological safety
    expect(isSelectivePhrase(84, TOTAL)).toBe(false); // culture science
    expect(isSelectivePhrase(279, TOTAL)).toBe(false); // servant leadership
  });

  it('scales with the corpus rather than sitting on a fixed number', () => {
    expect(isSelectivePhrase(50, 100000)).toBe(true);
    expect(isSelectivePhrase(50, TOTAL)).toBe(false);
    expect(MAX_PHRASE_SHARE).toBeLessThan(0.05);
  });

  it('keeps a floor so a small corpus does not make every phrase common', () => {
    expect(isSelectivePhrase(MIN_PHRASE_ALLOWANCE, 200)).toBe(true);
    expect(isSelectivePhrase(MIN_PHRASE_ALLOWANCE + 1, 200)).toBe(false);
  });

  it('treats a phrase that matches nothing as not worth a slot', () => {
    expect(isSelectivePhrase(0, TOTAL)).toBe(false);
  });

  it('allows the match when the corpus size is unknown, rather than dropping it', () => {
    expect(isSelectivePhrase(2, null)).toBe(true);
  });
});

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
