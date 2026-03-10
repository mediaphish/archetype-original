/**
 * AO Automation — List writing queue.
 * GET /api/ao/writing/list?email=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireOwnerEmail } from '../../../lib/ao/requireOwnerEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireOwnerEmail(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_writing_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, writing: data || [] });
  } catch (e) {
    console.error('[ao/writing/list]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
