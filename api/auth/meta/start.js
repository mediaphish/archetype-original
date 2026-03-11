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

function getMetaRedirectUri() {
  return process.env.META_REDIRECT_URI || `${SITE_URL}/api/auth/meta/callback`;
}

function getCookieDomain() {
  try {
    const url = new URL(SITE_URL);
    const host = (url.hostname || '').toLowerCase();
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
  const domain = getCookieDomain();
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
    redirect(res, `${SITE_URL}/ao/login`);
    return;
  }

  const appId = (process.env.META_APP_ID || '').trim();
  if (!appId) {
    redirect(res, `${SITE_URL}/ao/settings?provider=meta&status=error&message=Server+config+error`);
    return;
  }

  const secret = getCookieSecret();
  if (!secret) {
    redirect(res, `${SITE_URL}/ao/settings?provider=meta&status=error&message=Server+config+error`);
    return;
  }

  const state = randomBytes(24).toString('hex');
  if (!setStateCookie(res, state)) {
    redirect(res, `${SITE_URL}/ao/settings?provider=meta&status=error&message=Could+not+start+connection`);
    return;
  }

  const authUrl = new URL(META_OAUTH_URL);
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', getMetaRedirectUri());
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', process.env.META_SCOPE || DEFAULT_SCOPES);

  redirect(res, authUrl.toString());
}

