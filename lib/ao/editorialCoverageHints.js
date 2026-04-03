/**
 * Editorial memory coverage for publish planning (cooling-off, lane/tag frequency).
 */

import { supabaseAdmin } from '../supabase-admin.js';

function normKey(v) {
  const s = String(v || '').trim();
  return s ? s.slice(0, 80) : null;
}

/**
 * @param {string} email
 * @param {{ windowDays?: number }} [opts]
 * @returns {Promise<{ ok: boolean, coolingOff: Array<{ kind: string, key: string, count: number, note: string }>, totalPosts: number, error?: string }>}
 */
export async function getEditorialCoverageHints(email, opts = {}) {
  const windowDays = Math.max(1, Math.min(365, Number(opts.windowDays) || 30));
  const owner = String(email || '').trim().toLowerCase();
  if (!owner) return { ok: false, coolingOff: [], totalPosts: 0, error: 'email required' };

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const out = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('ao_lane,topic_tags,published_at', { count: 'exact' })
    .eq('created_by_email', owner)
    .eq('kind', 'social_post')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(1000);

  if (out.error) {
    return { ok: false, coolingOff: [], totalPosts: 0, error: out.error.message };
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

  const coolingOff = [];
  const total = rows.length || 0;
  if (total > 0) {
    for (const [k, v] of Object.entries(byTag)) {
      const count = Number(v || 0);
      if (count >= 3 && count / total >= 0.25) {
        coolingOff.push({
          kind: 'tag',
          key: k,
          count,
          note: 'High recent frequency for this theme — consider a fresh angle.',
        });
      }
    }
    for (const [k, v] of Object.entries(byLane)) {
      const count = Number(v || 0);
      if (count >= 3 && count / total >= 0.3) {
        coolingOff.push({
          kind: 'lane',
          key: k,
          count,
          note: 'High recent frequency on this lane — consider rotating topics.',
        });
      }
    }
  }
  coolingOff.sort((a, b) => (b.count || 0) - (a.count || 0));

  return {
    ok: true,
    coolingOff: coolingOff.slice(0, 8),
    totalPosts: total,
  };
}
