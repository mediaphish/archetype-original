/**
 * AO Scout — conservative cap status (owner-only).
 * GET /api/ao/scout/cap-status
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const DAILY_CAP = 10;

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id', { count: 'exact', head: true })
      .not('scout_run_id', 'is', null)
      .gte('created_at', since);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    const used = typeof count === 'number' ? count : 0;
    return res.status(200).json({
      ok: true,
      cap: DAILY_CAP,
      used,
      remaining: Math.max(0, DAILY_CAP - used),
      window: 'last_24_hours',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

