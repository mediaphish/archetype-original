/**
 * AO Scout — pending sources (new domains) that need approval.
 * GET /api/ao/scout/pending-sources
 */

import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scout_pending_sources')
      .select('*')
      .eq('status', 'pending')
      .order('first_seen_at', { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, pending: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

