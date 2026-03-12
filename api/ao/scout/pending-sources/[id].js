/**
 * AO Scout — approve/reject a pending source.
 * PATCH /api/ao/scout/pending-sources/[id]
 * Body: { action: 'approve'|'reject', notes?: string }
 */

import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

function normAction(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'approve' || s === 'approved') return 'approve';
  if (s === 'reject' || s === 'rejected') return 'reject';
  return '';
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id_required' });

  const action = normAction(req.body?.action);
  if (!action) return res.status(400).json({ ok: false, error: 'action_required' });

  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('ao_scout_pending_sources')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ ok: false, error: 'not_found' });

    const notes = req.body?.notes ? String(req.body.notes).trim().slice(0, 800) : null;

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('ao_scout_pending_sources')
        .update({ status: 'rejected', notes, first_seen_at: row.first_seen_at })
        .eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // Approve: add to watched sources as article + protect it.
    const domain = String(row.domain || '').trim();
    const exampleUrl = String(row.example_url || '').trim();
    if (!exampleUrl) {
      return res.status(400).json({ ok: false, error: 'missing_example_url' });
    }

    await supabaseAdmin.from('ao_external_sources').insert({
      url: exampleUrl,
      name: domain ? `Approved — ${domain}`.slice(0, 120) : null,
      source_type: 'article',
      origin: 'manual',
      is_protected: true,
      created_at: new Date().toISOString(),
    });

    // Seed the frontier with the approved URL so Scout can start immediately.
    try {
      await supabaseAdmin.from('ao_scout_frontier').insert({
        url: exampleUrl,
        discovered_from_url: null,
        depth: 0,
        priority: 2,
        status: 'pending',
        reason: 'approved_source_seed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (_) {}

    const { error: updErr } = await supabaseAdmin
      .from('ao_scout_pending_sources')
      .update({ status: 'approved', notes })
      .eq('id', id);
    if (updErr) return res.status(500).json({ ok: false, error: updErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

