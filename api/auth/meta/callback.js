/**
 * AO Automation — Meta OAuth callback.
 * GET /api/auth/meta/callback?code=...&state=... | error=...
 *
 * Validates state, exchanges code for token, exchanges for long-lived token,
 * selects the configured Facebook Page, stores Page token + Instagram business id,
 * redirects back to /ao/settings.
 */

import { createHmac } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { readAoSession } from '../../../lib/ao/requireAoSession.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const SETTINGS_PATH = '/ao/settings';
const COOKIE_NAME = 'ao_meta_oauth_state';

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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
  // Must exactly match the redirect_uri used when starting the connection.
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

function parseCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...v] = part.trim().split('=');
    if (key) out[key] = decodeURIComponent((v.join('=') || '').trim());
  }
  return out;
}

function verifyState(stateFromQuery, cookieValue) {
  const secret = getCookieSecret();
  if (!secret || !stateFromQuery || !cookieValue) return false;
  const idx = cookieValue.lastIndexOf('.');
  if (idx <= 0) return false;
  const state = cookieValue.slice(0, idx);
  const signature = cookieValue.slice(idx + 1);
  if (state !== stateFromQuery) return false;
  const expected = createHmac('sha256', secret).update(state).digest('hex');
  return signature === expected;
}

function clearStateCookie(req, res) {
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
  const origin = getRequestOrigin(req);
  if (origin.startsWith('https://')) clear.push('Secure');
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

async function exchangeCodeForUserToken({ appId, appSecret, redirectUri, code }) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString(), { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `Token exchange failed (${res.status})` };
  }
  if (!json.access_token) return { ok: false, error: 'No access token received' };
  return { ok: true, accessToken: json.access_token, expiresIn: json.expires_in || null };
}

async function exchangeForLongLivedUserToken({ appId, appSecret, shortUserToken }) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortUserToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `Long-lived exchange failed (${res.status})` };
  }
  if (!json.access_token) return { ok: false, error: 'No long-lived token received' };
  return { ok: true, accessToken: json.access_token, expiresIn: json.expires_in || null };
}

async function fetchPages(longUserToken) {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}');
  url.searchParams.set('access_token', longUserToken);
  const res = await fetch(url.toString(), { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `Failed to list pages (${res.status})` };
  }
  const data = Array.isArray(json.data) ? json.data : [];
  return { ok: true, pages: data };
}

function pickPage(pages) {
  const configured = (process.env.FACEBOOK_PAGE_ID || '').trim();
  if (configured) {
    const found = pages.find((p) => String(p?.id || '').trim() === configured);
    if (found) return { ok: true, page: found };
    return { ok: false, error: 'Configured Facebook Page not found for this Meta login. Check FACEBOOK_PAGE_ID.' };
  }
  if (pages.length === 1) return { ok: true, page: pages[0] };
  if (pages.length === 0) return { ok: false, error: 'No Facebook Pages found for this Meta login.' };
  return { ok: false, error: 'Multiple Facebook Pages found. Set FACEBOOK_PAGE_ID to select the right one.' };
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
  const stateFromQuery = query.get('state');
  const error = query.get('error');
  const errorDescription = query.get('error_description') || '';

  const toSettingsError = (message) => {
    clearStateCookie(req, res);
    redirect(req, res, SETTINGS_PATH, { provider: 'meta', status: 'error', ...(message ? { message } : {}) });
  };

  if (error) {
    toSettingsError(errorDescription || error);
    return;
  }

  if (!code || !stateFromQuery) {
    toSettingsError('Missing authorization code or state');
    return;
  }

  const cookieHeader = req.headers.cookie || req.headers.Cookie;
  const cookies = parseCookie(cookieHeader);
  const cookieValue = cookies[COOKIE_NAME];
  if (!verifyState(stateFromQuery, cookieValue)) {
    toSettingsError('Invalid or expired state');
    return;
  }

  clearStateCookie(req, res);

  const appId = (process.env.META_APP_ID || '').trim();
  const appSecret = (process.env.META_APP_SECRET || '').trim();
  if (!appId || !appSecret) {
    toSettingsError('Server configuration error');
    return;
  }

  const redirectUri = getMetaRedirectUri(req);

  try {
    const shortRes = await exchangeCodeForUserToken({ appId, appSecret, redirectUri, code });
    if (!shortRes.ok) {
      toSettingsError(shortRes.error);
      return;
    }

    const longRes = await exchangeForLongLivedUserToken({ appId, appSecret, shortUserToken: shortRes.accessToken });
    if (!longRes.ok) {
      toSettingsError(longRes.error);
      return;
    }

    const pagesRes = await fetchPages(longRes.accessToken);
    if (!pagesRes.ok) {
      toSettingsError(pagesRes.error);
      return;
    }

    const pick = pickPage(pagesRes.pages);
    if (!pick.ok) {
      toSettingsError(pick.error);
      return;
    }

    const page = pick.page;
    const pageToken = page.access_token;
    if (!pageToken) {
      toSettingsError('Meta did not return a Page token. Ensure the right permissions are approved.');
      return;
    }

    const igFromPage = page.instagram_business_account || null;
    const configuredIg = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();
    const instagramBusinessId = String(igFromPage?.id || '').trim() || configuredIg || null;
    const instagramUsername = String(igFromPage?.username || '').trim() || null;

    const userExpiresAt = longRes.expiresIn ? new Date(Date.now() + longRes.expiresIn * 1000).toISOString() : null;

    const row = {
      page_access_token: pageToken,
      user_access_token: longRes.accessToken,
      user_expires_at: userExpiresAt,
      facebook_page_id: String(page.id || '').trim() || null,
      facebook_page_name: String(page.name || '').trim() || null,
      instagram_business_id: instagramBusinessId,
      instagram_username: instagramUsername,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin.from('ao_meta_tokens').select('id').limit(1).maybeSingle();
    if (existing?.id) {
      await supabaseAdmin.from('ao_meta_tokens').update(row).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('ao_meta_tokens').insert(row);
    }

    const message = instagramBusinessId ? null : 'Connected Facebook Page. Instagram is not linked to this Page yet.';
    redirect(req, res, SETTINGS_PATH, { provider: 'meta', status: 'connected', ...(message ? { message } : {}) });
  } catch (e) {
    toSettingsError(e.message || 'Connection failed');
  }
}

