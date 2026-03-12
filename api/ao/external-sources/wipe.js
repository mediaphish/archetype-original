/**
 * AO Automation — Wipe external sources allowlist (start over).
 * POST /api/ao/external-sources/wipe
 */

import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('ao_external_sources')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      if (String(error.message || '').includes('ao_external_sources')) {
        return res.status(500).json({
          ok: false,
          error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[ao/external-sources wipe]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

