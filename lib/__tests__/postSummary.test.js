/**
 * @jest-environment node
 *
 * The Jezebel Archetype published with a summary that stopped mid-word:
 * "...and the law forbade him from selling it away. Ahab we"
 *
 * Bart: "I need big checks in place to make sure this never happens."
 */
import {
  summaryFromContent,
  isTruncatedSummary,
  SUMMARY_MAX,
} from '../ao/postSummary.js';

// The real opening of the published post, which produced the bad summary.
const JEZEBEL = `# The Jezebel Archetype

Naboth had a vineyard next to the palace in Jezreel. Ahab wanted it. He offered a fair trade, a better vineyard or a fair price, and Naboth said no. Not out of spite. The land was his inheritance, passed down from his fathers, and the law forbade him from selling it away. Ahab went home, lay on his bed, turned his face to the wall, and refused to eat.

That's the whole opening. A king, sulking over a vegetable garden.`;

describe('summaryFromContent', () => {
  it('never reproduces the Jezebel truncation', () => {
    const s = summaryFromContent(JEZEBEL);
    expect(s).not.toMatch(/Ahab we$/);
    expect(isTruncatedSummary(s)).toBeNull();
  });

  it('ends on a sentence boundary', () => {
    const s = summaryFromContent(JEZEBEL);
    expect(s).toMatch(/[.!?…]$/);
    expect(s.length).toBeLessThanOrEqual(SUMMARY_MAX);
  });

  it('returns short content unchanged', () => {
    expect(summaryFromContent('One short line about leadership.')).toBe(
      'One short line about leadership.'
    );
  });

  it('strips headings, emphasis and link targets', () => {
    const s = summaryFromContent('# Title\n\nSee **the post** at [Clarity](/journal/clarity) now.');
    expect(s).toBe('See the post at Clarity now.');
  });

  it('cuts on a word and marks it when no whole sentence fits', () => {
    // One sentence longer than the limit, so there is nothing clean to keep.
    const long = `${'word '.repeat(120).trim()} ends here.`;
    const s = summaryFromContent(long);
    expect(s.length).toBeLessThanOrEqual(SUMMARY_MAX);
    expect(s).toMatch(/…$/);
    expect(s).not.toMatch(/\bwor…$/); // not cut inside a word
  });

  it('handles empty input', () => {
    expect(summaryFromContent('')).toBe('');
    expect(summaryFromContent(null)).toBe('');
  });
});

describe('isTruncatedSummary', () => {
  it('catches the exact string that shipped', () => {
    const shipped =
      'Naboth had a vineyard next to the palace in Jezreel. Ahab wanted it. He offered a fair ' +
      'trade, a better vineyard or a fair price, and Naboth said no. Not out of spite. The land ' +
      'was his inheritance, passed down from his fathers, and the law forbade him from selling ' +
      'it away. Ahab we';
    expect(isTruncatedSummary(shipped)).toMatch(/cut off/i);
  });

  it('accepts a well formed summary', () => {
    expect(
      isTruncatedSummary(
        'Jezebel never drew a sword. She wrote letters in the king’s name and let the ' +
          'process do the killing.'
      )
    ).toBeNull();
  });

  it('rejects an empty or stub summary', () => {
    expect(isTruncatedSummary('')).toMatch(/empty/);
    expect(isTruncatedSummary('Too short.')).toMatch(/only \d+ characters/);
  });

  it('rejects a summary with no terminal punctuation', () => {
    expect(
      isTruncatedSummary('This is a reasonably long summary that simply stops without any ending')
    ).toMatch(/does not end in punctuation/);
  });

  it('accepts a summary ending in a closing quote', () => {
    expect(
      isTruncatedSummary(
        'She asked the question that turns the whole archetype: "Do you now govern Israel?"'
      )
    ).toBeNull();
  });
});
