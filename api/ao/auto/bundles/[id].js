import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  if (req.method === 'GET') {
    const out = await supabaseAdmin
      .from('ao_auto_bundles')
      .select('*')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .single();
    if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
    return res.status(200).json({ ok: true, bundle: out.data });
  }

  if (req.method === 'PATCH') {
    const patch = {
      updated_at: new Date().toISOString(),
    };
    if (req.body?.rating != null) patch.rating = safeText(req.body.rating, 10).toLowerCase() || null;
    if (req.body?.rating_reason != null) patch.rating_reason = safeText(req.body.rating_reason, 500) || null;
    if (req.body?.bundle_dna && typeof req.body.bundle_dna === 'object') patch.bundle_dna = req.body.bundle_dna;
    if (req.body?.series_name != null) patch.series_name = safeText(req.body.series_name, 120) || null;
    if (req.body?.tags && Array.isArray(req.body.tags)) patch.tags = req.body.tags.map((x) => safeText(x, 40)).filter(Boolean).slice(0, 12);
    if (req.body?.mark_used) patch.last_used_at = new Date().toISOString();
    const out = await supabaseAdmin
      .from('ao_auto_bundles')
      .update(patch)
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();
    if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
    return res.status(200).json({ ok: true, bundle: out.data });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
