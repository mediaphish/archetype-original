import { matchSeries } from '../ao/seriesMatch.js';

/** Bart's six real series, shaped as seriesMemory returns them. */
const SERIES = [
  {
    series_key: 'leadership-is-not-a-clenched-fist',
    title: 'Leadership Is Not a Clenched Fist, but a Guiding Hand',
    parts: [{ slug: 'leadership-is-not-a-clenched-fist-but-a-guiding-hand-part-1', title: 'Leadership Is Not a Clenched Fist, but a Guiding Hand (Part 1)' }],
  },
  {
    series_key: 'the-case-for-servant-leadership',
    title: 'The Case for Servant Leadership',
    parts: [{ slug: 'the-case-for-servant-leadership-part-1', title: 'The Case for Servant Leadership (Part 1)' }],
  },
  {
    series_key: 'psychology-of-servant-leadership',
    title: 'Psychology of Servant Leadership',
    parts: [{ slug: 'psychology-of-servant-leadership-part-1', title: 'Psychology of Servant Leadership, Part 1: The Servant Mindset' }],
  },
  {
    series_key: 'the-7-conditions',
    title: 'The 7 Conditions',
    parts: [{ slug: 'ali-series-clarity', title: 'The 7 Conditions: Clarity' }],
  },
  {
    series_key: 'the-archetype',
    title: 'The Archetype Series',
    parts: [
      { slug: 'the-judas-archetype', title: 'The Judas Archetype' },
      { slug: 'the-ruth-archetype', title: 'The Ruth Archetype' },
    ],
  },
  {
    series_key: 'power-vs-authority',
    title: 'Power vs. Authority',
    parts: [{ slug: 'power-vs-authority-part-1', title: 'Power vs. Authority: Part 1 — The Hunger' }],
  },
];

describe('matchSeries', () => {
  describe('the phrasings that used to fail entirely', () => {
    // The old detector used a hardcoded list of five slugs. For the Archetype
    // series — seven published entries — none of these matched, so Auto wrote
    // the next part with zero prior parts in context.
    it.each([
      "let's write the next Archetype post",
      'next in the Archetype series',
      'write part 8 of the Archetype series',
      'what should the next archetype be?',
      'the Judas Archetype',
    ])('resolves %p to the Archetype series', (msg) => {
      expect(matchSeries(msg, SERIES)?.key).toBe('the-archetype');
    });
  });

  describe('disambiguation between series that share vocabulary', () => {
    // Everything Bart writes is about leadership, so "leadership" identifies
    // nothing. Only tokens unique to one series may score.
    it('does not let a shared token pick the wrong series', () => {
      expect(matchSeries('another Case for Servant Leadership post', SERIES)?.key).toBe(
        'the-case-for-servant-leadership'
      );
    });

    it('separates the two servant-leadership series', () => {
      expect(matchSeries('continue Psychology of Servant Leadership', SERIES)?.key).toBe(
        'psychology-of-servant-leadership'
      );
      expect(matchSeries('the case for servant leadership', SERIES)?.key).toBe(
        'the-case-for-servant-leadership'
      );
    });

    it('matches the clenched fist series on its distinctive words', () => {
      expect(matchSeries('the clenched fist series', SERIES)?.key).toBe(
        'leadership-is-not-a-clenched-fist'
      );
    });

    it('does not match on the bare word "leadership" alone', () => {
      expect(matchSeries('some thoughts on leadership', SERIES)).toBeNull();
    });
  });

  describe('other series', () => {
    it.each([
      ['part 4 of Power vs. Authority', 'power-vs-authority'],
      ['next in the 7 Conditions series', 'the-7-conditions'],
    ])('resolves %p', (msg, key) => {
      expect(matchSeries(msg, SERIES)?.key).toBe(key);
    });
  });

  describe('no false positives', () => {
    it.each([
      "let's do a post about pizza",
      'what time is it',
      '',
    ])('returns null for %p', (msg) => {
      expect(matchSeries(msg, SERIES)).toBeNull();
    });

    it('returns null with no series recorded', () => {
      expect(matchSeries('the Archetype series', [])).toBeNull();
      expect(matchSeries('the Archetype series')).toBeNull();
    });
  });

  it('returns the recorded part slugs so the caller loads the whole series', () => {
    const hit = matchSeries('the Judas Archetype', SERIES);
    expect(hit.slugs).toEqual(['the-judas-archetype', 'the-ruth-archetype']);
  });
});
