/**
 * AO Automation — Scan status and recent errors.
 * GET /api/ao/automation-status?email=xxx
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAoSession } from '../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scan_log')
      .select('scan_type, started_at, finished_at, candidates_found, candidates_inserted, error_message')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    const rows = data || [];
    const internal = rows.find((r) => r.scan_type === 'internal');
    const external = rows.find((r) => r.scan_type === 'external');
    return res.status(200).json({
      ok: true,
      last_internal_scan: internal?.finished_at || internal?.started_at || null,
      last_external_scan: external?.finished_at || external?.started_at || null,
      recent_errors: rows.filter((r) => r.error_message).slice(0, 5),
    });
  } catch (e) {
    console.error('[ao/automation-status]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
