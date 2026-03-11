/**
 * AO Automation — X OAuth 2.0 (PKCE) callback.
 * GET /api/auth/x/callback?code=...&state=... | error=...
 */

import { createHmac } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { readAoSession } from '../../../lib/ao/requireAoSession.js';
import { base64UrlEncode } from '../../../lib/social/xConnection.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const SETTINGS_PATH = '/ao/settings';
const COOKIE_NAME = 'ao_x_oauth_state';

const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const USER_ME_URL = 'https://api.x.com/2/users/me';

function getClientId() {
  return (process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '').trim();
}
function getClientSecret() {
  return (process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || '').trim();
}

function getCookieSecret() {
  return process.env.AO_OAUTH_COOKIE_SECRET || process.env.X_OAUTH_STATE_SECRET;
}

function getCanonicalOrigin() {
  // Must exactly match the callback URL registered in X.
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

function parseCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...v] = part.trim().split('=');
    if (key) out[key] = decodeURIComponent((v.join('=') || '').trim());
  }
  return out;
}

function verifyAndDecode(cookieValue, stateFromQuery) {
  const secret = getCookieSecret();
  if (!secret || !cookieValue) return { ok: false };
  const idx = cookieValue.lastIndexOf('.');
  if (idx <= 0) return { ok: false };
  const payloadB64 = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  const expected = createHmac('sha256', secret).update(payloadB64).digest('hex');
  if (sig !== expected) return { ok: false };
  try {
    const json = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
    if (!json?.state || !json?.codeVerifier) return { ok: false };
    if (stateFromQuery && json.state !== stateFromQuery) return { ok: false };
    return { ok: true, payload: json };
  } catch {
    return { ok: false };
  }
}

function clearStateCookie(req, res) {
  const origin = getRequestOrigin(req);
  const isSecure = origin.startsWith('https://');
  const clear = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  const domain = getCookieDomain(req);
  if (domain) clear.push(`Domain=${domain}`);
  if (isSecure) clear.push('Secure');
  res.setHeader('Set-Cookie', clear.join('; '));
}

function redirect(req, res, path, query = {}) {
  const q = new URLSearchParams(query).toString();
  const origin = getRequestOrigin(req);
  const url = `${origin}${path}${q ? `?${q}` : ''}`;
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

function getQuery(req) {
  const raw = typeof req.url === 'string' ? req.url : '';
  const idx = raw.indexOf('?');
  const search = idx >= 0 ? raw.slice(idx) : '';
  return new URLSearchParams(search);
}

function basicAuthHeader(clientId, clientSecret) {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

async function exchangeCode({ code, codeVerifier, redirectUri }) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId) return { ok: false, error: 'X_CLIENT_ID is missing' };

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  }).toString();

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) headers.Authorization = basicAuthHeader(clientId, clientSecret);

  const res = await fetch(TOKEN_URL, { method: 'POST', headers, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error_description || json.error || `Token exchange failed (${res.status})` };
  }
  if (!json.access_token) return { ok: false, error: 'No access token received' };
  return { ok: true, token: json };
}

async function fetchMe(accessToken) {
  const res = await fetch(USER_ME_URL, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.detail || `Users/me failed (${res.status})` };
  return { ok: true, data: json.data || null };
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
    clearStateCookie(req, res);
    redirect(req, res, '/ao/login');
    return;
  }

  const query = getQuery(req);
  const code = query.get('code');
  const state = query.get('state');
  const error = query.get('error');
  const errorDescription = query.get('error_description') || '';

  const toSettingsError = (message) => {
    clearStateCookie(req, res);
    redirect(req, res, SETTINGS_PATH, { provider: 'x', status: 'error', ...(message ? { message } : {}) });
  };

  if (error) {
    toSettingsError(errorDescription || error);
    return;
  }

  if (!code || !state) {
    toSettingsError('Missing authorization code or state');
    return;
  }

  const cookies = parseCookie(req.headers.cookie || req.headers.Cookie);
  const rawCookie = cookies[COOKIE_NAME];
  const decoded = verifyAndDecode(rawCookie, state);
  if (!decoded.ok) {
    toSettingsError('Invalid or expired state');
    return;
  }

  clearStateCookie(req, res);

  // For the OAuth token exchange, this redirect URI must match the one used in
  // the authorize URL exactly. Since X may only allow one callback URL, we
  // always use SITE_URL (www).
  const redirectUri = getRedirectUri();

  try {
    const exchanged = await exchangeCode({ code, codeVerifier: decoded.payload.codeVerifier, redirectUri });
    if (!exchanged.ok) {
      toSettingsError(exchanged.error);
      return;
    }

    const token = exchanged.token;
    const expiresIn = token.expires_in ? Number(token.expires_in) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    const me = await fetchMe(token.access_token);
    const userId = me.ok ? String(me.data?.id || '') : '';
    const username = me.ok ? String(me.data?.username || '') : '';

    const row = {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      expires_at: expiresAt,
      scope: token.scope || null,
      token_type: token.token_type || null,
      user_id: userId || null,
      username: username || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin.from('ao_x_tokens').select('id').limit(1).maybeSingle();
    if (existing?.id) {
      await supabaseAdmin.from('ao_x_tokens').update(row).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('ao_x_tokens').insert(row);
    }

    redirect(req, res, SETTINGS_PATH, {
      provider: 'x',
      status: 'connected',
      ...(username ? { message: `Connected as @${username}` } : {}),
    });
  } catch (e) {
    toSettingsError(e.message || 'Connection failed');
  }
}

