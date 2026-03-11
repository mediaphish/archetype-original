/**
 * Meta connection resolver for AO Automation.
 *
 * Prefers the stored AO Meta connection (Supabase table `ao_meta_tokens`),
 * falling back to environment variables.
 *
 * This allows the AO console to "Connect Meta" without requiring you to paste
 * fresh tokens into Vercel every time.
 */

import { supabaseAdmin } from '../supabase-admin.js';

let cache = null;
let cacheAtMs = 0;
const CACHE_TTL_MS = 30_000;

function envConnection() {
  const token = (process.env.META_ACCESS_TOKEN || '').trim() || null;
  const pageId = (process.env.FACEBOOK_PAGE_ID || '').trim() || null;
  const igBusinessId = (process.env.INSTAGRAM_BUSINESS_ID || '').trim() || null;
  return token ? { source: 'env', token, pageId, igBusinessId } : null;
}

export async function getMetaConnection() {
  const now = Date.now();
  if (cache && now - cacheAtMs < CACHE_TTL_MS) return cache;

  // Try stored connection first.
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_meta_tokens')
      .select('page_access_token, facebook_page_id, instagram_business_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.page_access_token) {
      const token = String(data.page_access_token || '').trim() || null;
      const pageId = String(data.facebook_page_id || '').trim() || null;
      const igBusinessId = String(data.instagram_business_id || '').trim() || null;
      if (token) {
        cache = { source: 'stored', token, pageId, igBusinessId };
        cacheAtMs = now;
        return cache;
      }
    }
  } catch (_) {
    // ignore; we'll fall back to env
  }

  cache = envConnection();
  cacheAtMs = now;
  return cache;
}

