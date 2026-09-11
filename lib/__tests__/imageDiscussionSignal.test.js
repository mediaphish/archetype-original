/**
 * @jest-environment node
 *
 * The Cain regression: Auto announced the header image step, Bart said
 * "Approve", and no series reference images loaded because the check read only
 * Bart's message.
 */
import { signalsImageDiscussion } from '../ao/imageDiscussionSignal.js';

const AUTO_ANNOUNCED_IMAGE =
  "Next step is the header image. Before I propose anything, let me check the series' visual style " +
  'so this stays consistent with the other Archetype Series entries.';

describe('the turn Bart approves an image step', () => {
  it('counts "Approve" as image discussion when Auto just raised the image', () => {
    expect(signalsImageDiscussion('Approve', AUTO_ANNOUNCED_IMAGE)).toBe(true);
  });

  it('still returns false when the previous reply was not about images', () => {
    expect(signalsImageDiscussion('Approve', 'Here is the revised third section.')).toBe(false);
  });
});

describe('the current message alone still works', () => {
  it.each([
    ['What should the header image be?'],
    ['Propose the cover image'],
    ['Give me an image prompt'],
    ['Keep the visual style consistent'],
  ])('%s', (msg) => {
    expect(signalsImageDiscussion(msg, '')).toBe(true);
  });

  it('is false for ordinary writing talk', () => {
    expect(signalsImageDiscussion('Tighten the second paragraph.', '')).toBe(false);
  });
});

describe('deferral wins, and only from the current message', () => {
  it('respects "we are not touching images yet" right after image talk', () => {
    // The reason deferral reads only the current message: the previous reply is
    // full of image talk precisely when Bart calls it off.
    expect(signalsImageDiscussion('We are not touching images yet.', AUTO_ANNOUNCED_IMAGE)).toBe(false);
  });

  it.each([
    ['Not yet, the post first.'],
    ['We are a long way from the image.'],
  ])('%s', (msg) => {
    expect(signalsImageDiscussion(msg, AUTO_ANNOUNCED_IMAGE)).toBe(false);
  });
});

describe('lookback is exactly one message', () => {
  it('does not reach past the immediately preceding reply', () => {
    // An earlier version checked five messages back, and one mention of a later
    // step re-triggered image loading for turns on end. Confirmed live.
    expect(signalsImageDiscussion('Approve', 'Section three is tightened.')).toBe(false);
  });

  it('tolerates junk', () => {
    expect(signalsImageDiscussion('Approve', null)).toBe(false);
    expect(signalsImageDiscussion(null, AUTO_ANNOUNCED_IMAGE)).toBe(true);
  });
});
