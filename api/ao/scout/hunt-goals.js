/**
 * AO Automation — Add a hunt goal to Scout chase list
 * POST /api/ao/scout/hunt-goals
 *
 * Body:
 * - topic (string, required)
 * - why (string, optional)
 * - priority (int, optional)
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const topic = safeText(req.body?.topic, 240);
  const why = safeText(req.body?.why, 600) || null;
  const priority = clampInt(req.body?.priority, 60, 1, 100);

  if (!topic) return res.status(400).json({ ok: false, error: 'topic required' });

  try {
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('ao_scout_chase_list')
      .insert({
        created_by_email: auth.email,
        topic,
        why,
        priority,
        expires_at: expiresAt,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .select('id,topic,why,priority,expires_at,status,created_at,updated_at')
      .single();

    if (error) {
      if (String(error.message || '').includes('ao_scout_chase_list')) {
        return res.status(500).json({
          ok: false,
          error: 'Chase list table is not set up yet. Run database/ao_scout_chase_list.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, chase: data });
  } catch (e) {
    console.error('[ao/scout/hunt-goals]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

