/**
 * AO Automation — list opportunities related to a target (by source_name match).
 * GET /api/ao/quotes/by-source
 *
 * Query:
 * - q: string (required) search term (usually person/brand name)
 * - status: pending | held | approved | rejected | all (default: all)
 * - competitor_only: true|false (default: true)
 * - limit: number (default: 50, max: 200)
 */
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function truthy(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const qRaw = String(req.query?.q || '').trim();
  if (!qRaw) return res.status(400).json({ ok: false, error: 'q required' });

  const status = String(req.query?.status || 'all').trim().toLowerCase();
  const competitorOnly = req.query?.competitor_only == null ? true : truthy(req.query.competitor_only);
  const limit = clampInt(req.query?.limit, 50, 1, 200);

  const run = async (useOwnerFilter) => {
    let q = supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (useOwnerFilter) q = q.eq('created_by_email', auth.email);
    if (status !== 'all') q = q.eq('status', status);
    if (competitorOnly) q = q.ilike('source_type', 'competitor_%');
    q = q.ilike('source_name', `%${qRaw}%`);

    return await q;
  };

  try {
    let out = await run(true);
    if (out.error && String(out.error.message || '').includes('created_by_email')) {
      out = await run(false);
    }
    if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
    return res.status(200).json({ ok: true, quotes: out.data || [] });
  } catch (e) {
    console.error('[ao/quotes/by-source]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

