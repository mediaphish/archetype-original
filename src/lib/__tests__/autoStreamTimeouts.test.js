/**
 * The "Auto didn't respond in time" abort, split into the two failures it was
 * conflating. Observed in production 2026-08-25: a revision turn logged nothing
 * between 19:40:59 and the user's retry at 19:43:45, because the client gave up
 * after 90 seconds of silence while the server was still working.
 */
import {
  abortReasonFor,
  abortMessageFor,
  STALL_MS,
  HARD_CAP_MS,
} from '../autoStreamTimeouts.js';

describe('abortReasonFor', () => {
  it('keeps waiting while events are arriving', () => {
    expect(abortReasonFor({ silentForMs: 20_000, elapsedMs: 200_000 })).toBeNull();
  });

  it('does not abort at exactly the stall threshold', () => {
    expect(abortReasonFor({ silentForMs: STALL_MS, elapsedMs: 0 })).toBeNull();
  });

  it('aborts on silence past the stall threshold', () => {
    expect(abortReasonFor({ silentForMs: STALL_MS + 1, elapsedMs: 95_000 })).toBe('stall');
  });

  it('aborts on the hard cap even while events are still arriving', () => {
    // The case the old code could not express: heartbeats flowing, so no stall,
    // but the turn has run past what the server itself will allow.
    expect(abortReasonFor({ silentForMs: 1_000, elapsedMs: HARD_CAP_MS + 1 })).toBe('cap');
  });

  it('reports a stall when both limits are exceeded', () => {
    // A wedged tool is the actionable problem. Telling someone to break the
    // request into smaller pieces sends them to fix the wrong thing.
    expect(abortReasonFor({ silentForMs: STALL_MS + 1, elapsedMs: HARD_CAP_MS + 1 })).toBe('stall');
  });

  it('sits the hard cap above the server budget so the two sides agree', () => {
    // Server SOFT_TIMEOUT_MS is 270_000. A client cap at or below that would cut
    // off turns the server was about to finish, which is the original bug in a
    // new place.
    expect(HARD_CAP_MS).toBeGreaterThan(270_000);
  });

  it('leaves the stall window wide enough for several missed heartbeats', () => {
    // The server heartbeats every 15s. 90s is six intervals, so one slow tick
    // never trips it.
    expect(STALL_MS / 15_000).toBeGreaterThanOrEqual(4);
  });
});

describe('abortMessageFor', () => {
  it('tells the user a tool is stuck on a stall', () => {
    expect(abortMessageFor('stall')).toMatch(/stuck tool call/i);
  });

  it('tells the user to shrink the request on the hard cap', () => {
    expect(abortMessageFor('cap')).toMatch(/smaller request/i);
  });

  it('gives the two failures different text', () => {
    // They shared one message, which is why this read as intermittent.
    expect(abortMessageFor('stall')).not.toBe(abortMessageFor('cap'));
  });

  it('falls back to the stall wording when the reason was never recorded', () => {
    expect(abortMessageFor(null)).toBe(abortMessageFor('stall'));
  });
});
