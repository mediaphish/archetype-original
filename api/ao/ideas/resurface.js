/**
 * AO Automation — Library resurfacing
 * GET /api/ao/ideas/resurface?count=
 *
 * Returns a small set of older items so "Held" isn't a graveyard.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const count = clampInt(req.query?.count, 3, 1, 8);

    const { data, error } = await supabaseAdmin
      .from('ao_ideas')
      .select('id,title,raw_input,source_url,status,held_at,hold_reason,created_at,updated_at')
      .eq('created_by_email', auth.email)
      .in('status', ['held', 'brief_ready'])
      .order('created_at', { ascending: true })
      .limit(count);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true, ideas: data || [] });
  } catch (e) {
    console.error('[ao/ideas/resurface]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

