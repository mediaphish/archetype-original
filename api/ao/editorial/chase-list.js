/**
 * AO Newsroom Shared Memory Loop
 * GET /api/ao/editorial/chase-list
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const auth = requireAoSession(req, res);
  if (!auth) return;
  const email = auth.email;

  const out = await supabaseAdmin
    .from('ao_scout_chase_list')
    .select('id,topic,why,priority,expires_at,status,updated_at,created_at')
    .eq('created_by_email', email)
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(30);

  if (out.error) {
    return res.status(500).json({
      ok: false,
      error: out.error.message || 'Could not load chase list (missing table?)',
      missing_sql: ['database/ao_scout_chase_list.sql']
    });
  }

  return res.status(200).json({ ok: true, chase: out.data || [] });
}

