/**
 * AO Automation — External source delete.
 * DELETE /api/ao/external-sources/:id
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const { error } = await supabaseAdmin
      .from('ao_external_sources')
      .delete()
      .eq('id', id);
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
    console.error('[ao/external-sources DELETE]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

