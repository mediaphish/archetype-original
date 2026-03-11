/**
 * AO Automation — Discard writing queue item.
 * POST /api/ao/writing/[id]/discard?email=xxx
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Writing ID required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_writing_queue')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Writing item not found' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, writing: data });
  } catch (e) {
    console.error('[ao/writing/discard]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
