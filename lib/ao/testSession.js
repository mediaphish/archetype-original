/**
 * Which chat sessions are ours rather than a visitor's.
 *
 * 2026-09-10. Verifying Archy sent two "Archy Can't Answer" emails to Bart's
 * inbox and wrote the only two rows that table has ever held. Every record of
 * Archy failing a visitor was test traffic, so the table said nothing about
 * visitors at all. Bart found the emails eighteen days later.
 *
 * A regression suite makes that worse, not better: it is meant to run on every
 * deploy and it deliberately asks questions Archy should refuse, which is
 * exactly what triggers the alert. So a known prefix marks a session as ours,
 * and the alerting path skips it. The answer itself is never changed, because
 * an eval that exercises a different code path than a visitor measures nothing.
 */

/** Prefixes that mark a session as ours. Visitors get `session_<timestamp>_...`. */
export const TEST_SESSION_PREFIXES = ['claude_verification_test', 'cc-', 'archy-eval-', 'test_', 'eval_'];

/**
 * Is this session ours rather than a visitor's?
 *
 * @param {string|null|undefined} sessionId
 * @returns {boolean}
 */
export function isTestSession(sessionId) {
  const id = String(sessionId || '').trim().toLowerCase();
  if (!id) return false;
  return TEST_SESSION_PREFIXES.some((prefix) => id.startsWith(prefix));
}
