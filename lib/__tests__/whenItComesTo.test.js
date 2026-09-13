/**
 * @jest-environment node
 *
 * "when it comes to" is banned as a filler idiom, not as English.
 *
 * 2026-09-13 every production build stopped, including a deploy carrying other
 * work and the scheduled publish of The Cain Archetype, because a published
 * devotional said "how does a leader receive correction when it comes to them".
 * That is correction arriving at a person, the literal sense. The gate's own
 * instruction is to change the pattern when the pattern is wrong.
 */
import { detectVoiceViolationsInProse } from '../ao/voiceGuardrails.js';

const hits = (text) => detectVoiceViolationsInProse(text).filter((v) => v.id === 'when-it-comes-to');

describe('when it comes to', () => {
  it('lets through the real devotional sentence that stopped the builds', () => {
    const line =
      'A leader spends most of their time thinking about how to correct others well. This proverb asks a different question, how does a leader receive correction when it comes to them.';
    expect(hits(line)).toHaveLength(0);
  });

  it.each([
    ['when it comes to him'],
    ['when it comes to you'],
    ['when it comes to me'],
    ['when it comes to us'],
    ['when it comes to her'],
    ['when it comes to mind'],
  ])('allows the literal sense: %s', (phrase) => {
    expect(hits(`The answer changes ${phrase}.`)).toHaveLength(0);
  });

  it.each([
    ['When it comes to leadership, trust is earned.'],
    ['Most teams struggle when it comes to hiring.'],
    ['when it comes to the budget, nobody agrees'],
    ['WHEN IT COMES TO accountability'],
  ])('still catches the filler idiom: %s', (text) => {
    expect(hits(text)).toHaveLength(1);
  });
});
