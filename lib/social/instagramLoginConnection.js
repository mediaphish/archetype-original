/**
 * Instagram API with Instagram Login — connection resolver.
 *
 * For Instagram Business/Creator accounts that have NO linked Facebook Page (e.g.
 * mediaphish), Meta's classic graph.facebook.com pipeline cannot discover or publish to
 * them (see api/ao/meta-accounts.js — Page-linked discovery only). This resolver reads
 * from ao_instagram_login_tokens instead, keyed by account_id (e.g. 'ig_mediaphish'), and
 * is used exclusively by the graph.instagram.com adapters in
 * lib/social/instagramLoginAdapters.js.
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
 */

import { supabaseAdmin } from '../supabase-admin.js';

const CACHE_TTL_MS = 30_000;
const cache = new Map(); // account_id -> { data, cachedAtMs }

export async function getInstagramLoginConnection(accountId) {
  if (!accountId) return null;
  const now = Date.now();
  const cached = cache.get(accountId);
  if (cached && now - cached.cachedAtMs < CACHE_TTL_MS) return cached.data;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_instagram_login_tokens')
      .select('access_token, instagram_user_id, instagram_username, expires_at')
      .eq('account_id', accountId)
      .maybeSingle();
    if (error || !data?.access_token || !data?.instagram_user_id) {
      cache.set(accountId, { data: null, cachedAtMs: now });
      return null;
    }
    const result = {
      token: String(data.access_token).trim(),
      igUserId: String(data.instagram_user_id).trim(),
      username: data.instagram_username || null,
      expiresAt: data.expires_at || null
    };
    cache.set(accountId, { data: result, cachedAtMs: now });
    return result;
  } catch (_) {
    return null;
  }
}

/** Invalidate the cache for one account (call this right after a token refresh writes a new row). */
export function invalidateInstagramLoginCache(accountId) {
  cache.delete(accountId);
}
