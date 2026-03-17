/**
 * AO Automation — competitor digest status.
 * GET /api/ao/competitors/digest-status
 */
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_competitor_digest_runs')
      .select('*')
      .eq('created_by_email', auth.email)
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      if (String(error.message || '').includes('ao_competitor_digest_runs')) {
        return res.status(500).json({
          ok: false,
          error: 'Competitor digest is not set up yet. Run database/ao_competitor_watch_lane.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    const row = Array.isArray(data) && data.length ? data[0] : null;
    return res.status(200).json({ ok: true, last_run: row });
  } catch (e) {
    console.error('[ao/competitors digest-status]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

