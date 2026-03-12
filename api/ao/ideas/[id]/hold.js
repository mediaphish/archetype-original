/**
 * AO Automation — Hold an idea (keeps it out of the active list).
 * POST /api/ao/ideas/:id/hold
 * Body (optional): { reason: string }
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

  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 300) : null;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_ideas')
      .update({
        status: 'held',
        held_at: new Date().toISOString(),
        hold_reason: reason,
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
    console.error('[ao/ideas hold]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

