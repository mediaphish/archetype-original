/**
 * AO Automation — External source update/delete.
 * PATCH /api/ao/external-sources/:id
 * DELETE /api/ao/external-sources/:id
 */

import { createClient } from '@supabase/supabase-js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function safeText(v, max) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.slice(0, max);
}

function normTier(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'competitor') return 'competitor';
  if (s === 'friendly') return 'friendly';
  return 'none';
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  if (req.method === 'PATCH') {
    const updates = {};
    if (req.body?.name != null) {
      const name = safeText(req.body.name, 120);
      updates.name = name || null;
    }
    if (req.body?.competitor_tier != null) {
      updates.competitor_tier = normTier(req.body.competitor_tier);
    }

    // No-ops are OK.
    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ ok: true, source: null });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('ao_external_sources')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
        if (String(error.message || '').includes('competitor_tier')) {
          return res.status(500).json({
            ok: false,
            error: 'Competitor tagging is not set up yet. Run database/ao_competitor_watch_lane.sql in Supabase.',
          });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.status(200).json({ ok: true, source: data });
    } catch (e) {
      console.error('[ao/external-sources PATCH]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'DELETE') {
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

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

