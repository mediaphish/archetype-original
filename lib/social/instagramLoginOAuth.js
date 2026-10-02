/**
 * Instagram API with Instagram Login — the sign-in half.
 *
 * 2026-10-02. The personal Instagram token was created by hand on July 26 and
 * expired on September 24. There was no way to renew it from the site: the only
 * endpoint was a read-only status check, because the design assumed the weekly
 * refresh job would keep it alive forever. That job had failed every Monday
 * since at least August 10 without telling anyone, and once a token is past its
 * expiry, refreshing cannot bring it back. Bart: "Get my personal instagram
 * connected again."
 *
 * So the flow lives here: Bart signs in to Instagram, Instagram hands back a
 * code, and the code becomes a sixty day token stored where the adapters read.
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
 */

/**
 * The scopes the posting adapters need.
 *
 * instagram_business_basic reads the account (id and username), and
 * instagram_business_content_publish is what actually allows a post. Asking for
 * less here would reconnect cleanly and then fail at publish time, which is the
 * failure mode this whole exercise exists to stop.
 */
export const INSTAGRAM_LOGIN_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

/** Instagram's own app credentials, which are not the Meta/Facebook app's. */
export function instagramAppCredentials() {
  const appId = String(process.env.INSTAGRAM_APP_ID || '').trim();
  const appSecret = String(process.env.INSTAGRAM_APP_SECRET || '').trim();
  return { appId, appSecret, configured: !!(appId && appSecret) };
}

/**
 * Where Instagram sends Bart back to. It has to match a redirect URI registered
 * on the app exactly, including the scheme and any trailing slash.
 */
export function instagramRedirectUri() {
  const explicit = String(process.env.INSTAGRAM_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  const base = String(process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com').replace(/\/+$/, '');
  return `${base}/api/ao/instagram-login/callback`;
}

/** The page Bart is sent to in order to approve the connection. */
export function buildAuthorizeUrl(state) {
  const { appId } = instagramAppCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: instagramRedirectUri(),
    scope: INSTAGRAM_LOGIN_SCOPES.join(','),
    response_type: 'code',
  });
  if (state) params.set('state', state);
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/**
 * The code Instagram puts on the return URL, traded for a short lived token.
 * Instagram arrives with the code suffixed by "#_", which is not part of it.
 */
export async function exchangeCodeForShortLivedToken(code) {
  const { appId, appSecret } = instagramAppCredentials();
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: instagramRedirectUri(),
    code: String(code || '').replace(/#_$/, ''),
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    return { ok: false, error: data?.error_message || data?.error?.message || `Instagram refused the code (${res.status})` };
  }
  return {
    ok: true,
    token: String(data.access_token),
    userId: data.user_id != null ? String(data.user_id) : null,
  };
}

/** The short lived token traded for one that lasts sixty days. */
export async function exchangeForLongLivedToken(shortLivedToken) {
  const { appSecret } = instagramAppCredentials();
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: String(shortLivedToken || ''),
  });

  const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    return { ok: false, error: data?.error?.message || `Instagram refused the token exchange (${res.status})` };
  }
  const seconds = Number(data.expires_in) || 60 * 24 * 60 * 60;
  return {
    ok: true,
    token: String(data.access_token),
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

/** Who the token belongs to, so the row carries a username rather than an id alone. */
export async function fetchAccount(token) {
  const params = new URLSearchParams({ fields: 'id,username', access_token: String(token || '') });
  const res = await fetch(`https://graph.instagram.com/v21.0/me?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    return { ok: false, error: data?.error?.message || `Could not read the Instagram account (${res.status})` };
  }
  return { ok: true, id: String(data.id), username: data.username ? String(data.username) : null };
}
