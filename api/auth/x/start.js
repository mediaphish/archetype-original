/**
 * AO Automation — Start X OAuth 2.0 (PKCE) connect.
 * GET /api/auth/x/start
 */

import { randomBytes, createHmac } from 'crypto';
import { readAoSession } from '../../../lib/ao/requireAoSession.js';
import { base64UrlEncode, sha256Base64Url } from '../../../lib/social/xConnection.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const COOKIE_NAME = 'ao_x_oauth_state';
const COOKIE_MAX_AGE = 600; // 10 minutes

const AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';

const DEFAULT_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
].join(' ');

function getClientId() {
  return (process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '').trim();
}

function getCookieSecret() {
  return process.env.AO_OAUTH_COOKIE_SECRET || process.env.X_OAUTH_STATE_SECRET;
}

function getCanonicalOrigin() {
  // X requires an exact callback URL match. Since their UI may only allow
  // one callback URL, we always use SITE_URL (www) for the OAuth round-trip.
  return SITE_URL;
}

function getRequestOrigin(req) {
  try {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    if (!host) return SITE_URL;
    const hostLower = host.toLowerCase();
    const allowed =
      hostLower === 'localhost' ||
      hostLower.endsWith('.vercel.app') ||
      hostLower.endsWith('archetypeoriginal.com');
    if (!allowed) return SITE_URL;
    return `${proto}://${host}`;
  } catch {
    return SITE_URL;
  }
}

function getRedirectUri() {
  const origin = getCanonicalOrigin();
  return `${origin}/api/auth/x/callback`;
}

function getCookieDomain(req) {
  try {
    const origin = getRequestOrigin(req);
    const url = new URL(origin);
    const host = String(url.hostname || '').toLowerCase();
    if (!host) return null;
    if (host === 'localhost') return null;
    if (host.endsWith('.vercel.app')) return null;
    const root = host.startsWith('www.') ? host.slice(4) : host;
    if (root.endsWith('archetypeoriginal.com')) return 'archetypeoriginal.com';
    return null;
  } catch {
    return null;
  }
}

function sign(payloadB64) {
  const secret = getCookieSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(payloadB64).digest('hex');
}

function setStateCookie(req, res, value, maxAgeSeconds) {
  const origin = getRequestOrigin(req);
  const isSecure = origin.startsWith('https://');
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  const domain = getCookieDomain(req);
  if (domain) cookie.push(`Domain=${domain}`);
  if (isSecure) cookie.push('Secure');
  res.setHeader('Set-Cookie', cookie.join('; '));
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

  const session = readAoSession(req);
  if (!session.ok) {
    redirect(res, '/ao/login');
    return;
  }

  const clientId = getClientId();
  if (!clientId) {
    redirect(res, `/ao/settings?provider=x&status=error&message=Server+config+error`);
    return;
  }

  const secret = getCookieSecret();
  if (!secret) {
    redirect(res, `/ao/settings?provider=x&status=error&message=Server+config+error`);
    return;
  }

  const state = randomBytes(24).toString('hex');
  const codeVerifier = base64UrlEncode(randomBytes(48)); // 64-ish chars, URL-safe
  const codeChallenge = sha256Base64Url(codeVerifier);

  const payload = {
    state,
    codeVerifier,
    iat: Date.now(),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  if (!sig) {
    redirect(res, `/ao/settings?provider=x&status=error&message=Could+not+start+connection`);
    return;
  }
  setStateCookie(req, res, `${payloadB64}.${sig}`, COOKIE_MAX_AGE);

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri());
  authUrl.searchParams.set('scope', process.env.X_SCOPE || DEFAULT_SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  redirect(res, authUrl.toString());
}

