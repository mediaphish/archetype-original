/**
 * @jest-environment node
 *
 * The loop Bart found in The Jonathan Archetype (2026-09-24).
 *
 * Thresholds here are the ones measured that day: the bad draft had four
 * paragraph pairs at 0.75 or above, and no published post had more than one.
 */
import {
  paragraphsForRepetition,
  cosineSimilarity,
  findRepeatedPairs,
  repetitionNote,
  PAIR_THRESHOLD,
  FLAG_AT_PAIRS,
} from '../ao/draftRepetition.js';

const longParagraph = (seed) => `${seed} ${'word '.repeat(40)}`.trim();

describe('paragraphsForRepetition', () => {
  const draft = [
    '---\ntitle: X\nsummary: Y\n---',
    '# The Jonathan Archetype',
    '**A bold section heading**',
    longParagraph('Jonathan takes off his robe.'),
    'Too short to carry a claim.',
    '- a list item that is quite long but still a list item and should not count as a paragraph here',
    longParagraph('He yielded anyway.'),
  ].join('\n\n');

  it('keeps prose and drops front matter, headings, lists and one-liners', () => {
    const paragraphs = paragraphsForRepetition(draft);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toMatch(/^Jonathan takes off his robe/);
  });

  it('returns nothing for an empty draft', () => {
    expect(paragraphsForRepetition('')).toEqual([]);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for the same vector and 0 for a perpendicular one', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it('is 0 for malformed input rather than throwing', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe('findRepeatedPairs', () => {
  // Paragraphs 0, 3 and 5 say the same thing in different words. The rest each
  // say something of their own, so they must not match one another either.
  const same = [1, 0, 0, 0];
  const embeddings = [same, [0, 1, 0, 0], [0, 0, 1, 0], same, [0, 0, 0, 1], same];

  it('finds every restatement, worst first, skipping adjacent paragraphs', () => {
    const pairs = findRepeatedPairs(embeddings);
    expect(pairs.length).toBe(3);
    expect(pairs.every((p) => p.similarity >= PAIR_THRESHOLD)).toBe(true);
    expect(pairs[0].similarity).toBeGreaterThanOrEqual(pairs[pairs.length - 1].similarity);
  });

  it('treats a paragraph that builds on the one before it as continuity', () => {
    expect(findRepeatedPairs([same, same])).toEqual([]);
  });

  it('ignores paragraphs that could not be embedded', () => {
    expect(findRepeatedPairs([same, null, null, same])).toHaveLength(1);
  });
});

describe('repetitionNote', () => {
  const paragraphs = [
    'He yielded anyway, not to David talent, but to a decision already made above his own authority.',
    'Something else entirely.',
    'Jonathan is the third leader in this family to face a decision above his own authority.',
    'A fourth paragraph.',
    'Getting out of the way of your own rightful claim is rarer than servant leadership.',
  ];
  const pairs = [
    { a: 0, b: 2, similarity: 0.781 },
    { a: 0, b: 4, similarity: 0.776 },
    { a: 2, b: 4, similarity: 0.763 },
  ];

  it('names the repeats and says it is not about length', () => {
    const note = repetitionNote(pairs, paragraphs);
    expect(note).toContain('make the same point in different words');
    expect(note).toContain('not about length');
    expect(note).toContain('decision already made above his own authority');
  });

  it('stays quiet below the flagging line, because one echo is writing', () => {
    expect(repetitionNote(pairs.slice(0, FLAG_AT_PAIRS - 1), paragraphs)).toBeNull();
    expect(repetitionNote([], paragraphs)).toBeNull();
  });

  it('never uses an em dash', () => {
    expect(repetitionNote(pairs, paragraphs)).not.toMatch(/—/);
  });
});
