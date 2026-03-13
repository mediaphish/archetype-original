/**
 * AO Automation — Opportunities (first-class objects)
 * GET /api/ao/opportunities?status=&limit=&offset=
 * POST /api/ao/opportunities
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

  if (req.method === 'GET') {
    const status = String(req.query?.status || 'new').trim().toLowerCase();
    const limit = clampInt(req.query?.limit, 20, 1, 200);
    const offset = clampInt(req.query?.offset, 0, 0, 100000);

    try {
      let q = supabaseAdmin
        .from('ao_opportunities')
        .select('*', { count: 'exact' })
        .eq('created_by_email', auth.email)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') q = q.eq('status', status);

      q = q.range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) {
        if (String(error.message || '').includes('ao_opportunities')) {
          return res.status(500).json({ ok: false, error: 'Opportunities are not set up yet. Run database/ao_opportunities.sql in Supabase.' });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({
        ok: true,
        opportunities: data || [],
        page: { status, limit, offset, total: typeof count === 'number' ? count : null },
      });
    } catch (e) {
      console.error('[ao/opportunities GET]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const title = req.body?.title ? String(req.body.title).trim().slice(0, 140) : '';
    const opportunity_brief = req.body?.opportunity_brief ? String(req.body.opportunity_brief).trim() : '';
    if (!title && !opportunity_brief) {
      return res.status(400).json({ ok: false, error: 'title or opportunity_brief required' });
    }

    try {
      const payload = {
        title: title || null,
        opportunity_brief: opportunity_brief || null,
        why_it_matters: req.body?.why_it_matters ? String(req.body.why_it_matters).trim() : null,
        ao_lane: req.body?.ao_lane ? String(req.body.ao_lane).trim().slice(0, 80) : null,
        topic_tags: Array.isArray(req.body?.topic_tags) ? req.body.topic_tags.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 10) : null,
        source_quote_id: req.body?.source_quote_id || null,
        source_idea_id: req.body?.source_idea_id || null,
        status: 'new',
        created_by_email: auth.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('ao_opportunities')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (String(error.message || '').includes('ao_opportunities')) {
          return res.status(500).json({ ok: false, error: 'Opportunities are not set up yet. Run database/ao_opportunities.sql in Supabase.' });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, opportunity: data });
    } catch (e) {
      console.error('[ao/opportunities POST]', e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

