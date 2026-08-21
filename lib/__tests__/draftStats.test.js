/**
 * @jest-environment node
 */
import { countDraftWords, countSections, draftStats, toProse } from '../ao/draftStats.js';

describe('countDraftWords', () => {
  it('counts plain prose', () => {
    expect(countDraftWords('Leadership is not a clenched fist.')).toBe(6);
  });

  it('ignores frontmatter — a piece gets no credit for its own metadata', () => {
    const md = `---
title: "The Jezebel Archetype"
slug: the-jezebel-archetype
tags: ["leadership", "servant-leadership"]
---

Two words.`;
    expect(countDraftWords(md)).toBe(2);
  });

  it('does not count heading hashes or list bullets as words', () => {
    const md = `## The Pattern

- first item
- second item`;
    expect(countDraftWords(md)).toBe(6);
  });

  it('keeps link text and drops the URL', () => {
    expect(countDraftWords('See the [Ruth post](https://example.com/ruth) today.')).toBe(5);
  });

  it('drops bare URLs entirely', () => {
    // "Read now" — the URL is not a word a reader reads.
    expect(countDraftWords('Read https://archetypeoriginal.com/journal now')).toBe(2);
  });

  it('excludes fenced code blocks', () => {
    const md = ['Before.', '', '```', 'const a = 1;', '```', '', 'After.'].join('\n');
    expect(countDraftWords(md)).toBe(2);
  });

  it('treats hyphenated and apostrophised forms as one word each', () => {
    expect(countDraftWords("servant-leadership isn't self-evident")).toBe(3);
  });

  it('does not count stray punctuation as words', () => {
    expect(countDraftWords('Truth — clarity — trust')).toBe(3);
  });

  it('ignores emphasis markers', () => {
    expect(countDraftWords('**Bold** and _italic_ text')).toBe(4);
  });

  it('returns 0 for empty or whitespace input', () => {
    expect(countDraftWords('')).toBe(0);
    expect(countDraftWords('   \n\n  ')).toBe(0);
    expect(countDraftWords(null)).toBe(0);
  });
});

describe('countSections', () => {
  it('counts markdown headings', () => {
    expect(countSections('# One\n\ntext\n\n## Two\n\n### Three')).toBe(3);
  });

  it('ignores hashes inside fenced code', () => {
    const md = ['# Real', '', '```', '# not a heading', '```'].join('\n');
    expect(countSections(md)).toBe(1);
  });

  it('does not count a bare hash with no text', () => {
    expect(countSections('#\n\n# Real')).toBe(1);
  });
});

describe('draftStats', () => {
  it('reports words alongside characters so a bad estimate is visible', () => {
    // The failure this replaces: the model inferred word count from length.
    // A 257-word brief was read as a finished piece earlier in this project.
    const md = 'word '.repeat(257).trim();
    const stats = draftStats(md);
    expect(stats.words).toBe(257);
    expect(stats.characters).toBeGreaterThan(stats.words);
  });

  it('counts paragraphs and estimates reading time', () => {
    const md = `${'word '.repeat(476).trim()}\n\n${'word '.repeat(10).trim()}`;
    const stats = draftStats(md);
    expect(stats.paragraphs).toBe(2);
    expect(stats.reading_minutes).toBe(2);
  });

  it('never reports 0 minutes for a non-empty draft', () => {
    expect(draftStats('Three little words').reading_minutes).toBe(1);
  });

  it('reports zeroes for an empty draft', () => {
    expect(draftStats('')).toMatchObject({ words: 0, sections: 0, reading_minutes: 0 });
  });
});

describe('toProse', () => {
  it('strips markdown furniture but keeps sentence text', () => {
    expect(toProse('## Heading\n\nSome **bold** text.')).toBe('Heading Some bold text.');
  });
});
