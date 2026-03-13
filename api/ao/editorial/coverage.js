/**
 * AO Newsroom Shared Memory Loop
 * GET /api/ao/editorial/coverage?windowDays=30
 *
 * Coverage is calculated from recently posted social posts in editorial memory.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function asInt(v, d) {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : d;
}

function normKey(v) {
  const s = String(v || '').trim();
  return s ? s.slice(0, 80) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const auth = requireAoSession(req, res);
  if (!auth) return;
  const email = auth.email;

  const windowDays = Math.max(1, Math.min(365, asInt(req.query?.windowDays, 30)));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const out = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('ao_lane,topic_tags,published_at', { count: 'exact' })
    .eq('created_by_email', email)
    .eq('kind', 'social_post')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(1000);

  if (out.error) {
    return res.status(500).json({
      ok: false,
      error: out.error.message || 'Could not calculate coverage (memory not set up yet?)',
      missing_sql: ['database/ao_editorial_memory_items.sql']
    });
  }

  const rows = Array.isArray(out.data) ? out.data : [];
  const byLane = {};
  const byTag = {};

  for (const r of rows) {
    const lane = normKey(r?.ao_lane);
    if (lane) byLane[lane] = (byLane[lane] || 0) + 1;
    const tags = Array.isArray(r?.topic_tags) ? r.topic_tags : [];
    for (const t of tags) {
      const k = normKey(t);
      if (!k) continue;
      byTag[k] = (byTag[k] || 0) + 1;
    }
  }

  const topLanes = Object.entries(byLane).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => ({ key: k, count: v }));
  const topTags = Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([k, v]) => ({ key: k, count: v }));

  return res.status(200).json({
    ok: true,
    windowDays,
    since,
    totalPosts: rows.length,
    byLane,
    byTag,
    topLanes,
    topTags
  });
}

