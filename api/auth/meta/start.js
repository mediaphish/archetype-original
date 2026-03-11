/**
 * AO Automation — Start Meta OAuth (redirect to Facebook with state).
 * GET /api/auth/meta/start
 *
 * Owner-only: requires AO session cookie.
 */

import { randomBytes, createHmac } from 'crypto';
import { readAoSession } from '../../../lib/ao/requireAoSession.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const COOKIE_NAME = 'ao_meta_oauth_state';
const COOKIE_MAX_AGE = 600; // 10 minutes

const GRAPH_VERSION = 'v25.0';
const META_OAUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const DEFAULT_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

function getCookieSecret() {
  return process.env.AO_OAUTH_COOKIE_SECRET || process.env.META_OAUTH_STATE_SECRET;
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

function getMetaRedirectUri(req) {
  // Use the exact origin of the current request so we don't bounce between www/non-www
  // (which can cause Meta to drop the code/state on the return trip).
  const origin = getRequestOrigin(req);
  return `${origin}/api/auth/meta/callback`;
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

function signState(state) {
  const secret = getCookieSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(state).digest('hex');
}

function setStateCookie(req, res, state) {
  const signature = signState(state);
  if (!signature) return false;
  const value = `${state}.${signature}`;
  const origin = getRequestOrigin(req);
  const isSecure = origin.startsWith('https://');
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  const domain = getCookieDomain(req);
  if (domain) cookie.push(`Domain=${domain}`);
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

  const session = readAoSession(req);
  if (!session.ok) {
    redirect(res, '/ao/login');
    return;
  }

  const appId = (process.env.META_APP_ID || '').trim();
  if (!appId) {
    redirect(res, `/ao/settings?provider=meta&status=error&message=Server+config+error`);
    return;
  }

  const secret = getCookieSecret();
  if (!secret) {
    redirect(res, `/ao/settings?provider=meta&status=error&message=Server+config+error`);
    return;
  }

  const state = randomBytes(24).toString('hex');
  if (!setStateCookie(req, res, state)) {
    redirect(res, `/ao/settings?provider=meta&status=error&message=Could+not+start+connection`);
    return;
  }

  const authUrl = new URL(META_OAUTH_URL);
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', getMetaRedirectUri(req));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', process.env.META_SCOPE || DEFAULT_SCOPES);

  redirect(res, authUrl.toString());
}

