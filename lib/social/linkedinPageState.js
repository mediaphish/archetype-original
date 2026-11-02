/**
 * Signed state for the company page sign-in round trip. Apart from
 * linkedinPage.js because it needs Node's crypto, which the browser build cannot
 * load, and scheduling code that the browser build sees reaches linkedinPage.js.
 */
import { createHmac, randomBytes } from 'crypto';

const cookieSecret = () => process.env.AO_OAUTH_COOKIE_SECRET || process.env.LINKEDIN_OAUTH_STATE_SECRET;

export function newPageState() {
  const secret = cookieSecret();
  if (!secret) return null;
  const state = randomBytes(24).toString('hex');
  return { state, cookie: `${state}.${createHmac('sha256', secret).update(state).digest('hex')}` };
}

export function pageStateMatches(stateFromQuery, cookieValue) {
  const secret = cookieSecret();
  if (!secret || !stateFromQuery || !cookieValue) return false;
  const idx = cookieValue.lastIndexOf('.');
  if (idx <= 0 || cookieValue.slice(0, idx) !== stateFromQuery) return false;
  return cookieValue.slice(idx + 1) === createHmac('sha256', secret).update(stateFromQuery).digest('hex');
}
