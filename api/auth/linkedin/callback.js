/**
 * AO Automation — LinkedIn OAuth 2.0 callback.
 * GET /api/auth/linkedin/callback?code=...&state=... | error=...&error_description=...
 * Validates state from signed cookie, exchanges code for token server-side, stores tokens, redirects to Settings.
 */

import { createHmac } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const SETTINGS_PATH = '/ao/settings';
const COOKIE_NAME = 'ao_linkedin_oauth_state';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

function getCookieSecret() {
  return process.env.AO_OAUTH_COOKIE_SECRET || process.env.LINKEDIN_OAUTH_STATE_SECRET;
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

function clearStateCookie(res) {
  const clear = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (SITE_URL.startsWith('https')) clear.push('Secure');
  res.setHeader('Set-Cookie', clear.join('; '));
}

function redirect(res, path, query = {}) {
  const q = new URLSearchParams(query).toString();
  const url = `${SITE_URL}${path}${q ? `?${q}` : ''}`;
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const query = getQuery(req);
  const code = query.get('code');
  const stateFromQuery = query.get('state');
  const error = query.get('error');
  const errorDescription = query.get('error_description') || '';

  const toSettingsError = (message) => {
    clearStateCookie(res);
    redirect(res, SETTINGS_PATH, { provider: 'linkedin', status: 'error', ...(message ? { message } : {}) });
  };

  if (error) {
    console.warn('[AO LinkedIn callback] LinkedIn error:', error, errorDescription);
    toSettingsError(errorDescription || error);
    return;
  }

  if (!code || !stateFromQuery) {
    console.warn('[AO LinkedIn callback] Missing code or state');
    toSettingsError('Missing authorization code or state');
    return;
  }

  const cookieHeader = req.headers.cookie || req.headers.Cookie;
  const cookies = parseCookie(cookieHeader);
  const cookieValue = cookies[COOKIE_NAME];

  if (!verifyState(stateFromQuery, cookieValue)) {
    console.warn('[AO LinkedIn callback] Invalid or missing state cookie');
    toSettingsError('Invalid or expired state');
    return;
  }

  clearStateCookie(res);

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[AO LinkedIn callback] Missing env config');
    toSettingsError('Server configuration error');
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();

    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      const errMsg = tokenData.error_description || tokenData.error || tokenRes.statusText;
      console.error('[AO LinkedIn callback] Token exchange failed:', tokenRes.status, errMsg);
      toSettingsError(errMsg || 'Token exchange failed');
      return;
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    if (!accessToken) {
      console.error('[AO LinkedIn callback] No access_token in response');
      toSettingsError('No access token received');
      return;
    }

    const row = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin.from('ao_linkedin_tokens').select('id').limit(1).maybeSingle();
    if (existing) {
      await supabaseAdmin.from('ao_linkedin_tokens').update(row).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('ao_linkedin_tokens').insert(row);
    }

    redirect(res, SETTINGS_PATH, { provider: 'linkedin', status: 'connected' });
  } catch (err) {
    console.error('[AO LinkedIn callback] Unexpected error:', err);
    toSettingsError('Connection failed');
  }
}
