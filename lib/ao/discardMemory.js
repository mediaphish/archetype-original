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

/**
 * Best-effort write of lightweight discard memory so deleted items do not return.
 */
export async function rememberDiscarded({ email, row, reason = 'Discarded' } = {}) {
  const ownerEmail = String(email || '').toLowerCase().trim();
  if (!ownerEmail || !row) return false;

  const canonicalUrl = normUrl(row?.source_url);
  const canonicalSlug = row?.is_internal ? String(row?.source_slug_or_url || '').trim() || null : null;
  if (!canonicalUrl && !canonicalSlug) return false;

  try {
    await supabaseAdmin.from('ao_discard_memory').upsert(
      {
        created_by_email: ownerEmail,
        item_kind: 'quote',
        canonical_url: canonicalUrl,
        canonical_slug: canonicalSlug,
        reason: String(reason || 'Discarded').slice(0, 200),
        created_at: new Date().toISOString(),
      },
      canonicalUrl ? { onConflict: 'created_by_email,canonical_url' } : { onConflict: 'created_by_email,canonical_slug' }
    );
    return true;
  } catch {
    return false;
  }
}

