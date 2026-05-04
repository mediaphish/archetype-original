/**
 * Operators client session helpers (magic link stores email in localStorage).
 * Optional short-lived bypass for private/staging testing via Vite env — see .env.example.
 */

export function isOperatorsAuthBypassActive() {
  if (import.meta.env.VITE_OPERATORS_AUTH_BYPASS !== 'true') return false;
  const email = (import.meta.env.VITE_OPERATORS_BYPASS_EMAIL || '').trim();
  if (!email) return false;
  const untilRaw = (import.meta.env.VITE_OPERATORS_BYPASS_UNTIL || '').trim();
  if (untilRaw) {
    const end = Date.parse(untilRaw);
    if (!Number.isNaN(end) && Date.now() >= end) return false;
  }
  return true;
}

export function getOperatorsBypassEmail() {
  return (import.meta.env.VITE_OPERATORS_BYPASS_EMAIL || '').trim();
}

/**
 * True if the Operators area should allow protected routes (storage, URL email, or temporary bypass).
 */
export function operatorsAuthAllowed() {
  if (isOperatorsAuthBypassActive()) return true;
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('operators_email');
  const urlEmail = new URLSearchParams(window.location.search).get('email');
  return !!(stored || urlEmail);
}
