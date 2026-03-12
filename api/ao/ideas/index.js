/**
 * AO Automation — Ideas inbox
 * GET /api/ao/ideas?status=&limit=&offset=&q=
 * POST /api/ao/ideas
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const status = String(req.query?.status || 'active').trim().toLowerCase();
    const limit = clampInt(req.query?.limit, 10, 1, 200);
    const offset = clampInt(req.query?.offset, 0, 0, 100000);
    const qText = String(req.query?.q || '').trim();

    const statusMap = {
      active: ['new', 'brief_ready'],
      held: ['held'],
      archived: ['archived'],
      all: null,
    };

    try {
      let q = supabaseAdmin
        .from('ao_ideas')
        .select('*', { count: 'exact' })
        .eq('created_by_email', auth.email)
        .order('created_at', { ascending: false });

      const statuses = statusMap[status] ?? statusMap.active;
      if (statuses) q = q.in('status', statuses);

      if (qText) {
        const pat = `%${qText.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        q = q.or(`title.ilike.${pat},raw_input.ilike.${pat}`);
      }

      q = q.range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) return res.status(500).json({ ok: false, error: error.message });

      return res.status(200).json({
        ok: true,
        ideas: data || [],
        page: { status, limit, offset, total: typeof count === 'number' ? count : null },
      });
    } catch (e) {
      console.error('[ao/ideas GET]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const raw_input = req.body?.raw_input ? String(req.body.raw_input).trim() : '';
    const title = req.body?.title ? String(req.body.title).trim().slice(0, 120) : null;
    const source_url = normUrl(req.body?.source_url);
    if (!raw_input || raw_input.length < 5) {
      return res.status(400).json({ ok: false, error: 'raw_input required' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('ao_ideas')
        .insert({
          title,
          raw_input,
          source_url,
          status: 'new',
          created_by_email: auth.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        if (String(error.message || '').includes('ao_ideas')) {
          return res.status(500).json({ ok: false, error: 'Ideas table is not set up yet. Run database/ao_ideas.sql in Supabase.' });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, idea: data });
    } catch (e) {
      console.error('[ao/ideas POST]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

