/**
 * GET/PATCH /api/ao/auto/reshare-settings
 *
 * GET: Returns current reshare settings (auto_approve flag)
 * PATCH: Updates reshare settings
 *
 * Body for PATCH: { auto_approve: boolean }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const OWNER_EMAIL = process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('ao_reshare_settings')
      .select('auto_approve, updated_at')
      .eq('owner_email', OWNER_EMAIL)
      .single();

    if (error || !data) {
      return res.status(200).json({ ok: true, auto_approve: false });
    }

    return res.status(200).json({
      ok: true,
      auto_approve: !!data.auto_approve,
      updated_at: data.updated_at,
    });
  }

  if (req.method === 'PATCH') {
    const { auto_approve } = req.body || {};
    if (typeof auto_approve !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'auto_approve must be a boolean' });
    }

    const { error } = await supabaseAdmin
      .from('ao_reshare_settings')
      .upsert(
        {
          owner_email: OWNER_EMAIL,
          auto_approve,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_email' }
      );

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, auto_approve });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
