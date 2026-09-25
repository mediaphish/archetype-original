/**
 * @jest-environment node
 *
 * The Series note Bart read twice (2026-09-25).
 */
import {
  stripDuplicateParagraphs,
  normalizeParagraph,
  isEligibleBlock,
  MIN_WORDS,
} from '../ao/duplicateParagraphs.js';

const SERIES_NOTE =
  '**Series note:** the corpus shows a "The Judas Archetype" already published, which the standing ' +
  "series list didn't have logged, so that is Entry 9, filling the gap. This next one would be Entry 12.";

describe('stripDuplicateParagraphs', () => {
  it('drops the second copy of a repeated paragraph and keeps the first in place', () => {
    const reply = [
      'Jonathan is confirmed live.',
      SERIES_NOTE,
      'Now the handoff for the next entry.',
      SERIES_NOTE,
      'Does Rehoboam work?',
    ].join('\n\n');

    const { reply: cleaned, removed } = stripDuplicateParagraphs(reply);
    expect(removed).toHaveLength(1);
    expect(cleaned.match(/Series note/g)).toHaveLength(1);
    expect(cleaned.indexOf('Series note')).toBeLessThan(cleaned.indexOf('Now the handoff'));
    expect(cleaned).toContain('Does Rehoboam work?');
  });

  it('leaves the spacing around what it removed intact', () => {
    const reply = `First block here.\n\n${SERIES_NOTE}\n\n${SERIES_NOTE}\n\nLast block here.`;
    const { reply: cleaned } = stripDuplicateParagraphs(reply);
    expect(cleaned).not.toMatch(/\n{3,}/);
    expect(cleaned.endsWith('Last block here.')).toBe(true);
  });

  it('ignores whitespace and case when deciding two paragraphs are the same', () => {
    const reply = `${SERIES_NOTE}\n\n${SERIES_NOTE.toUpperCase().replace(/ /g, '  ')}`;
    expect(stripDuplicateParagraphs(reply).removed).toHaveLength(1);
  });

  it('leaves near repetition alone, because that is a judgment about meaning', () => {
    const second = SERIES_NOTE.replace('This next one would be', 'The next one is');
    const { removed } = stripDuplicateParagraphs(`${SERIES_NOTE}\n\n${second}`);
    expect(removed).toEqual([]);
  });

  it('keeps structural lines that are supposed to recur', () => {
    const row = '| Rehoboam | negative | 1 Kings 12 | a kingdom lost in a single afternoon at Shechem |';
    const reply = `${row}\n\n${row}\n\n- ${'word '.repeat(30)}\n\n- ${'word '.repeat(30)}`;
    expect(stripDuplicateParagraphs(reply).removed).toEqual([]);
  });

  it('never touches fenced code', () => {
    const block = '```\nconst a = 1;\n```';
    const reply = `${block}\n\n${block}`;
    const { reply: cleaned, removed } = stripDuplicateParagraphs(reply);
    expect(removed).toEqual([]);
    expect(cleaned).toBe(reply);
  });

  it('returns short replies untouched', () => {
    expect(stripDuplicateParagraphs('').removed).toEqual([]);
    expect(stripDuplicateParagraphs('Approved.\n\nApproved.').removed).toEqual([]);
  });
});

describe('isEligibleBlock', () => {
  it('needs real length before a repeat counts as a mistake', () => {
    expect(isEligibleBlock('word '.repeat(MIN_WORDS))).toBe(true);
    expect(isEligibleBlock('word '.repeat(MIN_WORDS - 1))).toBe(false);
  });

  it('skips headings, quotes, lists and rules', () => {
    const long = 'word '.repeat(MIN_WORDS);
    for (const prefix of ['## ', '> ', '- ', '1. ', '| ']) {
      expect(isEligibleBlock(`${prefix}${long}`)).toBe(false);
    }
    expect(isEligibleBlock('---')).toBe(false);
  });
});

describe('normalizeParagraph', () => {
  it('collapses whitespace and case', () => {
    expect(normalizeParagraph('  The   Same\nThing  ')).toBe('the same thing');
  });
});
