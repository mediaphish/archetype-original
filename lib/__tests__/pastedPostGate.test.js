/**
 * @jest-environment node
 *
 * Every "must refuse" case below is a real row that exists in
 * ao_content_drafts right now, created from something Bart typed in chat. The
 * titles and opening lines are taken from the table verbatim.
 */
import { shouldSavePastedPost, looksLikeNoteToAuto, looksLikeATitle } from '../ao/pastedPostGate.js';

/** Pad to clear the 1,500 character length rule, as the real notes do. */
const pad = (s) => `${s}\n\n${'Detail that continues the note at real length. '.repeat(45)}`;

const REAL_NOTES = [
  [
    'no-that-one-was-approved-and-published',
    'No, that one was approved and published.\n\n**HANDOFF: The Archetype Series, Entry 9 — Daniel (Positive Archetype)**\n\nEight entries published, in order:',
  ],
  ['approved-with-two-changes', 'Approved with two changes.\n\n1. Fix the Odierno quote. "Trust is earned. It is not given" is correct.'],
  [
    'the-mccain-section-still-doesn-t-land',
    'The McCain section still doesn\'t land. Read your own last paragraph back: "a fleet the Navy\'s own review found had never been trained".',
  ],
  [
    'five-fixes-to-the-daniel-post',
    'Five fixes to the Daniel post. Everything else in it holds, and I verified the sourcing, so change only what is listed here.',
  ],
  ['better-both-issues-are-fixed', 'Better. Both issues are fixed.\n\nThe frame now matches the content.'],
  [
    'the-plainer-sense-is-just-lying-there',
    '"The plainer sense is just lying there." This doesn\'t fit my tone and voice. I would never use the word "planer" in anything.',
  ],
  [
    'with-a-door-back-open-behind-him',
    '"with a door back open behind him" We need to explain this better. I\'m not sure people understand what the "door back open" means.',
  ],
  [
    'the-piece-states-three-times',
    'The piece states three times that "you must rule over it" in Genesis 4:7 is "the same dominion language" from Genesis 1:28.',
  ],
  [
    'we-have-to-define-what-we-mean-by-squad',
    'We have to define what we mean by squad in "It has a squad in contact, and no room left to build trust."',
  ],
  [
    'continuing-the-accuracy-issue',
    'Continuing the accuracy issue I just flagged in "The current condition" section: the line "Gallup\'s own numbers show what."',
  ],
  [
    'ok-were-going-to-try-this-again',
    'Ok, were going to try this again. You wrote the entire post, deleted it because of a bug, then sent me the last draft.',
  ],
  [
    'do-we-have-any-examples-of-the-hazing',
    'Do we have any examples that have been published of the hazing? It would add good color to the post.',
  ],
  [
    'handoff-archetype-series-entry-9',
    '**HANDOFF: The Archetype Series, Entry 9 — Daniel (Positive Archetype)**\n\nEight entries published, in order:',
  ],
  [
    // Reads as a title by every other test: short, title case, no terminal
    // punctuation. It is working material, and it became a journal draft.
    'image-prompt-the-ruth-archetype',
    'Image prompt: The Ruth Archetype\n\nScene: The crossroads vow (Ruth 1:16-17). Two women stand on a dusty road.',
  ],
  ['this-was-the-planned-arc', 'This was the planned arc.\n\nPart 1 — They Still Call Him. Complete and published.'],
];

describe('real notes that became journal drafts are refused', () => {
  it.each(REAL_NOTES)('%s', (_slug, text) => {
    const out = shouldSavePastedPost(pad(text));
    expect(out.save).toBe(false);
  });

  it('names a gate and a reason, so the refusal is explainable', () => {
    const out = shouldSavePastedPost(pad(REAL_NOTES[0][1]));
    expect(typeof out.gate).toBe('string');
    expect(out.reason.length).toBeGreaterThan(20);
  });
});

describe('real posts are still saved', () => {
  it('saves a pasted post with a markdown H1', () => {
    const post = `# The Cain Archetype\n\n${'Cain did not fail because no one told him. '.repeat(20)}`;
    expect(shouldSavePastedPost(post).save).toBe(true);
  });

  it('saves a long paste whose first line is a real title', () => {
    const post = `The Cain Archetype\n\n${'He failed after being told, in words that named the danger. '.repeat(40)}`;
    expect(shouldSavePastedPost(post).save).toBe(true);
  });

  it('refuses a long paste with no title line, rather than slugging a sentence', () => {
    const text = `${'This is continuous prose with no title line at all, running long. '.repeat(40)}`;
    const out = shouldSavePastedPost(text);
    expect(out.save).toBe(false);
    expect(out.gate).toBe('no_title_line');
  });

  it('still refuses anything short', () => {
    expect(shouldSavePastedPost('Publish this.').save).toBe(false);
  });
});

describe('looksLikeATitle', () => {
  it.each([['The Cain Archetype'], ['Twenty Points Apart'], ['# Scoreboard Leadership'], ['*The Ruth Archetype*']])(
    'accepts %s',
    (line) => expect(looksLikeATitle(line)).toBe(true)
  );

  it.each([
    ['No, that one was approved and published.'],
    ['"The plainer sense is just lying there." This doesn\'t fit my tone.'],
    ['post.'],
    ['Approved with two changes.'],
    ['We have to define what we mean by squad in "It has a squad in contact, and no room left to build trust in the moment".'],
  ])('rejects %s', (line) => expect(looksLikeATitle(line)).toBe(false));
});

describe('looksLikeNoteToAuto', () => {
  it('is false for ordinary post prose', () => {
    expect(
      looksLikeNoteToAuto('Cain did not fail because no one told him. He failed after being told.')
    ).toBe(false);
  });

  it('is false for empty input', () => {
    expect(looksLikeNoteToAuto('')).toBe(false);
  });
});
