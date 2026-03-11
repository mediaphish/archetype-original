/**
 * AO Automation — LinkedIn connection status (no tokens exposed).
 * GET /api/ao/linkedin/status?email=xxx
 * Returns { ok: true, connected: boolean }.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    const connected = !!(data?.id);
    return res.status(200).json({ ok: true, connected });
  } catch (e) {
    console.error('[ao/linkedin/status]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
