import { supabaseAdmin } from '../supabase-admin.js';

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort check for whether an item was previously discarded/deleted,
 * so we can avoid rediscovering it.
 *
 * If the table doesn't exist yet, returns false.
 */
export async function isDiscarded({ email, canonicalUrl, canonicalSlug } = {}) {
  const ownerEmail = String(email || '').toLowerCase().trim();
  if (!ownerEmail) return false;

  const url = normUrl(canonicalUrl);
  const slug = String(canonicalSlug || '').trim() || null;
  if (!url && !slug) return false;

  try {
    let q = supabaseAdmin
      .from('ao_discard_memory')
      .select('id')
      .eq('created_by_email', ownerEmail)
      .limit(1);

    if (url) q = q.eq('canonical_url', url);
    else q = q.eq('canonical_slug', slug);

    const { data, error } = await q.maybeSingle();
    if (error) return false;
    return !!data?.id;
  } catch {
    return false;
  }
}

