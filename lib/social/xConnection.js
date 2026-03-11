/**
 * X (Twitter) connection resolver for AO Automation.
 *
 * Prefers the stored AO X connection (Supabase table `ao_x_tokens`),
 * falling back to environment variables used by the legacy OAuth 1.0a path.
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const USER_ME_URL = 'https://api.x.com/2/users/me';

function getClientId() {
  return (process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '').trim();
}
function getClientSecret() {
  return (process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || '').trim();
}

function basicAuthHeader(clientId, clientSecret) {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

async function refreshAccessToken(refreshToken) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId) return { ok: false, error: 'X_CLIENT_ID is missing' };
  if (!refreshToken) return { ok: false, error: 'No refresh token available' };

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  }).toString();

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) headers.Authorization = basicAuthHeader(clientId, clientSecret);

  const res = await fetch(TOKEN_URL, { method: 'POST', headers, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error_description || json.error || `Refresh failed (${res.status})` };
  }
  if (!json.access_token) return { ok: false, error: 'No access token returned from refresh' };

  const expiresIn = json.expires_in ? Number(json.expires_in) : null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  return {
    ok: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresAt,
    scope: json.scope || null,
    tokenType: json.token_type || null,
  };
}

async function fetchUserMe(accessToken) {
  const res = await fetch(USER_ME_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.detail || `Users/me failed (${res.status})` };
  const id = json.data?.id || null;
  const username = json.data?.username || null;
  return { ok: true, user: { id, username } };
}

export async function getStoredXTokenRow() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_x_tokens')
      .select('id, access_token, refresh_token, expires_at, scope, token_type, user_id, username, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
}

export async function getXAccessToken() {
  const row = await getStoredXTokenRow();
  if (!row?.access_token) return { ok: false, error: 'X not connected' };

  const nowMs = Date.now();
  const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
  const needsRefresh = expiresAtMs != null && Number.isFinite(expiresAtMs) && expiresAtMs - nowMs < 60_000;

  if (!needsRefresh) {
    return {
      ok: true,
      accessToken: row.access_token,
      username: row.username || null,
      userId: row.user_id || null,
      source: 'stored',
    };
  }

  const refreshed = await refreshAccessToken(row.refresh_token);
  if (!refreshed.ok) {
    return { ok: false, error: refreshed.error || 'Token refresh failed' };
  }

  // Best effort: update stored row.
  try {
    const me = await fetchUserMe(refreshed.accessToken);
    await supabaseAdmin
      .from('ao_x_tokens')
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        expires_at: refreshed.expiresAt,
        scope: refreshed.scope,
        token_type: refreshed.tokenType,
        ...(me.ok ? { user_id: me.user.id, username: me.user.username } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  } catch (_) {}

  return {
    ok: true,
    accessToken: refreshed.accessToken,
    username: row.username || null,
    userId: row.user_id || null,
    source: 'stored',
  };
}

export function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function sha256Base64Url(input) {
  const hash = crypto.createHash('sha256').update(input).digest();
  return base64UrlEncode(hash);
}

