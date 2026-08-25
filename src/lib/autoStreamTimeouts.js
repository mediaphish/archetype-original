/**
 * When to give up on an Auto turn, and why.
 *
 * Two different failures used to share one message, "Auto didn't respond in
 * time", which is why the bug read as intermittent for weeks:
 *
 *   - A stall. No SSE event for 90 seconds. Something is stuck.
 *   - The hard cap. Auto is genuinely still working and ran out of budget.
 *
 * The user can act on those differently, so they must not say the same thing.
 *
 * The stall threshold is only meaningful because the server now sends a
 * heartbeat every 15 seconds from the start of the request. It used to start the
 * heartbeat only after model token streaming finished, so the connection was
 * silent through extended thinking and through every tool call, and any one of
 * those running past 90 seconds aborted a request the server would have
 * completed. Retrying appeared to fix it only because a retry often takes a
 * shorter path.
 */

/** No SSE event for this long means something is stuck, not slow. */
export const STALL_MS = 90_000;

/**
 * Absolute ceiling. Just above the server's SOFT_TIMEOUT_MS of 270s so the two
 * sides agree on when to give up and a long turn is not cut off mid-flight.
 */
export const HARD_CAP_MS = 285_000;

/**
 * Decide whether to abort, and which limit fired.
 *
 * @returns {'stall'|'cap'|null} null means keep waiting.
 */
export function abortReasonFor({ silentForMs, elapsedMs, stallMs = STALL_MS, hardCapMs = HARD_CAP_MS }) {
  // Stall wins ties. A run that is both silent and long is a hang, and telling
  // someone to "break this into a smaller request" when a tool is wedged sends
  // them off to fix the wrong thing.
  if (silentForMs > stallMs) return 'stall';
  if (elapsedMs > hardCapMs) return 'cap';
  return null;
}

/** The message shown for an aborted turn. */
export function abortMessageFor(reason) {
  if (reason === 'cap') {
    return 'Auto is still working but exceeded the 5 minute limit. Try breaking this into a smaller request, or start a new thread.';
  }
  return 'Auto stopped responding. This is usually a stuck tool call. Try again, or start a new thread if it keeps happening.';
}
