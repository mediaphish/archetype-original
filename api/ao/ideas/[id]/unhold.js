/**
 * AO Automation — Unhold an idea (returns it to active).
 * POST /api/ao/ideas/:id/unhold
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    // Determine whether this should return to new vs brief_ready.
    const { data: existing } = await supabaseAdmin
      .from('ao_ideas')
      .select('id,why_it_matters')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .maybeSingle();

    const nextStatus = existing?.why_it_matters ? 'brief_ready' : 'new';

    const { data, error } = await supabaseAdmin
      .from('ao_ideas')
      .update({
        status: nextStatus,
        held_at: null,
        hold_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, idea: data });
  } catch (e) {
    console.error('[ao/ideas unhold]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

