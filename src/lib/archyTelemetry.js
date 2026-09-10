/**
 * Archy funnel telemetry.
 *
 * The question this answers, 2026-09-10: archy_questions held 10 rows in three
 * weeks, all of them Bart's own testing. On its own that number cannot
 * distinguish "nobody sees Archy", "people see him and are not invited well",
 * and "people ask and the answers disappoint". Those need three different
 * fixes. Counting impressions and opens alongside questions separates them.
 *
 * Design constraints:
 *
 *   Never affect the page. Every call is fire and forget with the error
 *   swallowed. Analytics that can break a visit are worse than none.
 *
 *   No personal data. A rotating per-tab id and a pathname. Nothing that
 *   identifies a person, and nothing that survives closing the tab.
 *
 *   Survive navigation. ChatApp generates its own sessionId on mount, which
 *   resets every time the panel remounts, so it cannot link a page view to a
 *   question asked two pages later. This id lives in sessionStorage instead.
 */

const KEY = 'archy_session_id';

export function getArchySessionId() {
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = `archy_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. A null id still gives us the event
    // counts, which is most of the value; only per-session stitching is lost.
    return null;
  }
}

/**
 * Send one event.
 *
 * keepalive matters: 'closed' and 'asked' can fire as the page is going away,
 * and a normal fetch is cancelled on unload while a keepalive one is not.
 */
export function trackArchy(event, meta = {}) {
  try {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    fetch('/api/chat/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        path: window.location.pathname,
        sessionId: getArchySessionId(),
        meta,
      }),
    }).catch(() => {});
  } catch {
    // Deliberately silent.
  }
}
