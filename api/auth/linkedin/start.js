/**
 * AO Automation — Start LinkedIn OAuth (redirect to LinkedIn with state).
 * GET /api/auth/linkedin/start
 * Generates a secure random state, stores it in a signed httpOnly cookie, redirects to LinkedIn OAuth URL.
 */

import { randomBytes, createHmac } from 'crypto';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const COOKIE_NAME = 'ao_linkedin_oauth_state';
const COOKIE_MAX_AGE = 600; // 10 minutes
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const SCOPES = 'openid profile email w_member_social';

function getCookieSecret() {
  return process.env.AO_OAUTH_COOKIE_SECRET || process.env.LINKEDIN_OAUTH_STATE_SECRET;
}

function signState(state) {
  const secret = getCookieSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(state).digest('hex');
}

function setStateCookie(res, state) {
  const signature = signState(state);
  if (!signature) return false;
  const value = `${state}.${signature}`;
  const isSecure = SITE_URL.startsWith('https');
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  if (isSecure) cookie.push('Secure');
  res.setHeader('Set-Cookie', cookie.join('; '));
  return true;
}

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('[AO LinkedIn start] Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI');
    redirect(res, `${SITE_URL}/ao/settings?provider=linkedin&status=error&message=Server+config+error`);
    return;
  }

  const secret = getCookieSecret();
  if (!secret) {
    console.error('[AO LinkedIn start] Missing AO_OAUTH_COOKIE_SECRET or LINKEDIN_OAUTH_STATE_SECRET');
    redirect(res, `${SITE_URL}/ao/settings?provider=linkedin&status=error&message=Server+config+error`);
    return;
  }

  const state = randomBytes(24).toString('hex');
  if (!setStateCookie(res, state)) {
    redirect(res, `${SITE_URL}/ao/settings?provider=linkedin&status=error&message=Could+not+start+connection`);
    return;
  }

  const authUrl = new URL(LINKEDIN_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', process.env.LINKEDIN_SCOPE || SCOPES);

  redirect(res, authUrl.toString());
}
