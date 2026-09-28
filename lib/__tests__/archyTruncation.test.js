/**
 * @jest-environment node
 *
 * The fragment a visitor would have seen (2026-09-28).
 */
import {
  ranOutOfRoom,
  trimToLastCompleteSentence,
  repairTruncatedAnswer,
  CONTINUE_NOTICE,
} from '../ao/archyTruncation.js';
import { isTestSession, TEST_SESSION_PREFIXES } from '../ao/testSession.js';

describe('ranOutOfRoom', () => {
  it('is true only for the output ceiling', () => {
    expect(ranOutOfRoom('max_tokens')).toBe(true);
    expect(ranOutOfRoom('end_turn')).toBe(false);
    expect(ranOutOfRoom('refusal')).toBe(false);
    expect(ranOutOfRoom(null)).toBe(false);
  });
});

describe('trimToLastCompleteSentence', () => {
  it('cuts back to the last finished thought', () => {
    expect(
      trimToLastCompleteSentence('It explains conditions, not people. It does not diagnose motives or inten')
    ).toBe('It explains conditions, not people.');
  });

  it('keeps a sentence closed by a quotation mark', () => {
    expect(trimToLastCompleteSentence('He said "stop." Then something unfini')).toBe('He said "stop."');
  });

  it('drops a heading or lead-in left introducing nothing', () => {
    expect(trimToLastCompleteSentence('One. Two.\n\n**What this means:**')).toBe('One. Two.');
    expect(trimToLastCompleteSentence('One. Two.\n\n## A heading')).toBe('One. Two.');
  });

  it('returns a fragment rather than nothing when there is no sentence end', () => {
    expect(trimToLastCompleteSentence('no sentence end here')).toBe('no sentence end here');
  });

  it('handles empty input', () => {
    expect(trimToLastCompleteSentence('')).toBe('');
    expect(trimToLastCompleteSentence(null)).toBe('');
  });
});

describe('repairTruncatedAnswer', () => {
  it('returns a whole answer and offers to continue', () => {
    const { text, truncated } = repairTruncatedAnswer('First point here. Second one cut off halfw');
    expect(truncated).toBe(true);
    expect(text).toBe(`First point here.\n\n${CONTINUE_NOTICE}`);
  });

  it('never uses a dash, because Archy does not', () => {
    expect(CONTINUE_NOTICE).not.toMatch(/[—–]/);
  });
});

describe('isTestSession', () => {
  it('recognises the session ids our own tooling uses', () => {
    expect(isTestSession('archy-eval-1759000000-3')).toBe(true);
    expect(isTestSession('claude_verification_test_1')).toBe(true);
    expect(isTestSession('cc-verify-sonnet5-final')).toBe(true);
  });

  it('treats a real visitor session as real', () => {
    expect(isTestSession('session_1787275000690_fzd5s9x2j')).toBe(false);
  });

  it('is not fooled by empty or missing ids', () => {
    expect(isTestSession('')).toBe(false);
    expect(isTestSession(null)).toBe(false);
    expect(isTestSession(undefined)).toBe(false);
  });

  it('matches regardless of case', () => {
    expect(isTestSession('ARCHY-EVAL-9')).toBe(true);
  });

  it('keeps the prefix list non-empty, or every session becomes a visitor', () => {
    expect(TEST_SESSION_PREFIXES.length).toBeGreaterThan(0);
  });
});
