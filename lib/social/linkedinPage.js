/**
 * The LinkedIn company page connection (2026-11-02).
 *
 * LinkedIn approved Community Management on a separate app, AO Page Publisher,
 * so the page signs in on its own with its own keys and its token lives in its
 * own table. The personal connection in ao_linkedin_tokens is never touched.
 *
 * Scopes stay at the minimum for one page: post, read counts on its own posts,
 * and confirm Bart administers it. No member identity is ever requested.
 */
import { createHmac, randomBytes } from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { getLinkedinVersionHeaders } from './linkedinVersion.js';

export const PAGE_REDIRECT_PATH = '/api/auth/linkedin/page-callback';
export const PAGE_STATE_COOKIE = 'ao_linkedin_page_oauth_state';
const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const REST_BASE = 'https://api.linkedin.com/rest';
const DEFAULT_SCOPES = 'w_organization_social r_organization_social rw_organization_admin';

const siteUrl = () => process.env.SITE_URL || 'https://www.archetypeoriginal.com';
const cookieSecret = () => process.env.AO_OAUTH_COOKIE_SECRET || process.env.LINKEDIN_OAUTH_STATE_SECRET;

export const pageRedirectUri = () => `${siteUrl()}${PAGE_REDIRECT_PATH}`;

/** What is missing before the page can connect, in Bart's terms. */
export function pageAppMissing(env = process.env) {
  return ['LINKEDIN_PAGE_CLIENT_ID', 'LINKEDIN_PAGE_CLIENT_SECRET'].filter((name) => !env[name]);
}

/** Signed state for the sign-in round trip. */
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

export function pageStateCookieHeader(value, maxAge) {
  const parts = [`${PAGE_STATE_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (siteUrl().startsWith('https')) parts.push('Secure');
  return parts.join('; ');
}

export function pageAuthUrl(state) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.LINKEDIN_PAGE_CLIENT_ID);
  url.searchParams.set('redirect_uri', pageRedirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('scope', process.env.LINKEDIN_PAGE_SCOPE || DEFAULT_SCOPES);
  return url.toString();
}

export async function exchangePageCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: pageRedirectUri(),
      client_id: process.env.LINKEDIN_PAGE_CLIENT_ID,
      client_secret: process.env.LINKEDIN_PAGE_CLIENT_SECRET,
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || `LinkedIn answered ${res.status}`);
  return data;
}

/** Pure: which page to post as. Only ever one, and never a guess. */
export function choosePageUrn(administered, configured = null) {
  const pages = [...new Set((administered || []).filter(Boolean))];
  if (configured && pages.includes(configured)) return { urn: configured };
  if (configured && !pages.length) return { urn: configured };
  if (configured) return { error: `This LinkedIn sign-in does not administer ${configured}.` };
  if (pages.length === 1) return { urn: pages[0] };
  if (!pages.length) return { error: 'This LinkedIn sign-in does not administer a company page.' };
  return { error: `This sign-in administers ${pages.length} company pages. Set LINKEDIN_PAGE_1_URN to the right one.` };
}

export async function findAdministeredPages(accessToken) {
  const res = await fetch(`${REST_BASE}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', ...getLinkedinVersionHeaders() },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data.elements || []).map((e) => e.organization || e.organizationTarget).filter(Boolean);
}

export async function savePageConnection({ accessToken, refreshToken, expiresIn, pageUrn }) {
  const now = Date.now();
  const row = {
    access_token: accessToken,
    refresh_token: refreshToken || null,
    expires_at: expiresIn ? new Date(now + Number(expiresIn) * 1000).toISOString() : null,
    page_urn: pageUrn,
    updated_at: new Date(now).toISOString(),
  };
  const { data: existing } = await supabaseAdmin.from('ao_linkedin_page_tokens').select('id').limit(1).maybeSingle();
  const out = existing?.id
    ? await supabaseAdmin.from('ao_linkedin_page_tokens').update(row).eq('id', existing.id)
    : await supabaseAdmin.from('ao_linkedin_page_tokens').insert(row);
  if (out.error) throw new Error(out.error.message);
}

export async function loadPageConnection() {
  const { data } = await supabaseAdmin
    .from('ao_linkedin_page_tokens')
    .select('access_token, expires_at, page_urn, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function deleteLinkedInPost(accessToken, postUrn) {
  const res = await fetch(`${REST_BASE}/posts/${encodeURIComponent(postUrn)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'X-RestLi-Method': 'DELETE',
      ...getLinkedinVersionHeaders(),
    },
  });
  return res.ok;
}
