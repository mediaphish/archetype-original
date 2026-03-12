/**
 * AO Automation — Idea detail
 * GET /api/ao/ideas/:id
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_ideas')
      .select('*')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, idea: data });
  } catch (e) {
    console.error('[ao/ideas id GET]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

