/**
 * @jest-environment node
 *
 * A pitch written into chat is checked, not only a saved one.
 *
 * 2026-09-15: Auto's first reply pitched a rerun of "Twenty Points Apart" and
 * said nothing about it. It only acknowledged overlap after Bart asked, and then
 * named the draft it had just created instead of the published post.
 * PITCH is the start of that first reply, verbatim.
 */
import { looksLikeNewPiecePitch, priorCoverageReplyNote } from '../ao/priorCoverage.js';

const PITCH = `Here's what I've got for Friday's resurface post.

**Working title:** "The Gap That Won't Close"
**Links back to:** /journal/twenty-points-apart

**The hook:** Korn Ferry's 2026 research on senior leaders found 86% believe their employees highly trust them, only 67% of employees agree.

**The reframe:** This keeps getting written up as a self-awareness gap. It isn't. It's the exact same finding "Twenty Points Apart" already made with the Gallup accountability data.

750-1000 words, matching the length and shape of your other resurface pieces.

Want me to write the full draft, or change the angle first?`;

describe('looksLikeNewPiecePitch', () => {
  it('recognises the Gap pitch', () => {
    expect(looksLikeNewPiecePitch(PITCH)).toBe(true);
  });

  it.each([
    'Confirmed, real state: draft is approved, header image is attached, and all 5 automated channels are scheduled for Wednesday. '.repeat(4),
    'The title of the LinkedIn caption reads fine, but the X caption runs long. I would cut the second sentence and keep the link. '.repeat(4),
    'Short reply.',
  ])('ignores an ordinary reply', (text) => {
    expect(looksLikeNewPiecePitch(text)).toBe(false);
  });
});

describe('priorCoverageReplyNote', () => {
  it('names the published post and date without an em dash', () => {
    const note = priorCoverageReplyNote([
      { title: 'Twenty Points Apart', url: '/journal/twenty-points-apart', published_at: '2026-08-28T11:01:26Z' },
    ]);
    expect(note).toContain('**Already published:**');
    expect(note).toContain('"Twenty Points Apart" (/journal/twenty-points-apart, published 2026-08-28)');
    expect(note).not.toMatch(/—/);
  });
});
