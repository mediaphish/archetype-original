/**
 * @jest-environment node
 *
 * Bart's cards colour key PHRASES inside a line — "the leaders reporting
 * STRESS this year are NOT WEAK" — not whole lines. Whole-line colour was the
 * first thing built and it cannot express the argument the design is making.
 */
import { jest } from '@jest/globals';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { parseEmphasis } from '../ao/generateQuoteCardImage.js';

describe('parseEmphasis', () => {
  it('splits a line into plain and accented spans', () => {
    expect(parseEmphasis('the leaders reporting *STRESS* this year')).toEqual([
      { text: 'the leaders reporting ', accent: false },
      { text: 'STRESS', accent: true },
      { text: ' this year', accent: false },
    ]);
  });

  it('handles several accents in one line', () => {
    const segs = parseEmphasis('are *not weak.* They carry a *design flaw* nobody caught.');
    expect(segs.filter((s) => s.accent).map((s) => s.text)).toEqual([
      'not weak.',
      'design flaw',
    ]);
  });

  it('handles a line that is entirely accented', () => {
    expect(parseEmphasis('*investment failure.*')).toEqual([
      { text: 'investment failure.', accent: true },
    ]);
  });

  it('returns one plain span when there is no emphasis', () => {
    expect(parseEmphasis('a clenched fist.')).toEqual([
      { text: 'a clenched fist.', accent: false },
    ]);
  });

  it('leaves an unpaired asterisk alone rather than swallowing the line', () => {
    // A stray asterisk must not turn the rest of the card invisible.
    expect(parseEmphasis('5 * 3 leaders')).toEqual([{ text: '5 * 3 leaders', accent: false }]);
  });

  it('returns nothing for empty input', () => {
    expect(parseEmphasis('')).toEqual([]);
    expect(parseEmphasis(null)).toEqual([]);
  });

  it('treats an empty marker pair as literal text, not as emphasis', () => {
    // Consistent with leaving unpaired asterisks alone: there is nothing between
    // the markers to emphasise, so nothing is silently deleted.
    expect(parseEmphasis('**')).toEqual([{ text: '**', accent: false }]);
  });

  it('preserves punctuation inside an accent span', () => {
    const segs = parseEmphasis('It is an *investment failure.*');
    expect(segs[1]).toEqual({ text: 'investment failure.', accent: true });
  });
});
