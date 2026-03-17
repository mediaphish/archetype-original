/**
 * AO Automation — Reject quote.
 * POST /api/ao/quotes/[id]/reject?email=xxx
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  try {
    // Load the row first so we can record a “don’t show me this again” memory.
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select()
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Quote not found' });
      }
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    const canonicalUrl = normUrl(row?.source_url);
    const canonicalSlug = row?.is_internal ? String(row?.source_slug_or_url || '').trim() || null : null;

    // Best-effort: record discard memory if the table exists.
    try {
      if (canonicalUrl || canonicalSlug) {
        await supabaseAdmin.from('ao_discard_memory').upsert(
          {
            created_by_email: auth.email,
            item_kind: 'quote',
            canonical_url: canonicalUrl,
            canonical_slug: canonicalSlug,
            reason: 'Rejected',
            created_at: new Date().toISOString(),
          },
          canonicalUrl ? { onConflict: 'created_by_email,canonical_url' } : { onConflict: 'created_by_email,canonical_slug' }
        );
      }
    } catch (_) {}

    // Delete the row forever (it should disappear from the system).
    const { error: delErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .delete()
      .eq('id', id)
      .eq('created_by_email', auth.email);

    if (delErr) return res.status(500).json({ ok: false, error: delErr.message });

    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('[ao/quotes/reject]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
