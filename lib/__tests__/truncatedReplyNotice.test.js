/**
 * @jest-environment node
 *
 * The turn that returned nothing (2026-09-24).
 */
import { truncatedReplyNotice, ranOutOfOutputRoom } from '../ao/truncatedReplyNotice.js';

describe('ranOutOfOutputRoom', () => {
  it('is true only for the output ceiling', () => {
    expect(ranOutOfOutputRoom('max_tokens')).toBe(true);
    expect(ranOutOfOutputRoom('end_turn')).toBe(false);
    expect(ranOutOfOutputRoom('tool_use')).toBe(false);
    expect(ranOutOfOutputRoom(null)).toBe(false);
  });
});

describe('truncatedReplyNotice', () => {
  it('says the work survived when the draft was saved', () => {
    const notice = truncatedReplyNotice({ savedDraft: true, hasPartialText: true });
    expect(notice).toContain('hit the output limit');
    expect(notice).toContain('draft was saved');
  });

  it('says plainly when nothing was saved', () => {
    const notice = truncatedReplyNotice({ savedDraft: false, hasPartialText: false });
    expect(notice).toContain('before anything was saved');
    expect(notice).toContain('Nothing was written to the draft');
  });

  it('carries no leading blank lines when there is no partial text to follow', () => {
    expect(truncatedReplyNotice({ savedDraft: true, hasPartialText: false }).startsWith('**')).toBe(true);
  });

  it('never uses an em dash', () => {
    expect(truncatedReplyNotice({ savedDraft: true, hasPartialText: true })).not.toMatch(/—/);
    expect(truncatedReplyNotice({ savedDraft: false, hasPartialText: true })).not.toMatch(/—/);
  });
});
