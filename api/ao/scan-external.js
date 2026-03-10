/**
 * AO Automation — External scan (stub).
 * POST /api/ao/scan-external?email=xxx
 * Logs a scan run; full RSS/article fetch can be added later.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireOwnerEmail } from '../../lib/ao/requireOwnerEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireOwnerEmail(req, res);
  if (!auth) return;

  try {
    const { data: logRow } = await supabaseAdmin
      .from('ao_scan_log')
      .insert({
        scan_type: 'external',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        candidates_found: 0,
        candidates_inserted: 0,
        error_message: 'External scan not yet implemented',
      })
      .select('id')
      .single();

    return res.status(200).json({
      ok: true,
      message: 'External scan stub executed',
      log_id: logRow?.id,
    });
  } catch (e) {
    console.error('[ao/scan-external]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
