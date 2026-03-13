/**
 * AO Newsroom Shared Memory Loop
 * POST /api/ao/editorial/generate-chase-list
 *
 * Uses:
 * - ao_editorial_settings.beat_priorities
 * - recent coverage from editorial memory
 *
 * Stores a fresh chase list in ao_scout_chase_list.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { generateChaseListMvp } from '../../../lib/ao/editorialChase.js';

function asInt(v, d) {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : d;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const auth = requireAoSession(req, res);
  if (!auth) return;
  const email = auth.email;

  const windowDays = Math.max(1, Math.min(365, asInt(req.body?.windowDays, 30)));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const settingsOut = await supabaseAdmin
    .from('ao_editorial_settings')
    .select('beat_priorities')
    .eq('created_by_email', email)
    .maybeSingle();
  if (settingsOut.error) {
    return res.status(500).json({
      ok: false,
      error: settingsOut.error.message || 'Could not load beat priorities (missing settings table?)',
      missing_sql: ['database/ao_editorial_settings.sql']
    });
  }
  const beatPriorities = Array.isArray(settingsOut.data?.beat_priorities) ? settingsOut.data.beat_priorities : [];

  const memOut = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('ao_lane,topic_tags,published_at')
    .eq('created_by_email', email)
    .eq('kind', 'social_post')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(1000);
  if (memOut.error) {
    return res.status(500).json({
      ok: false,
      error: memOut.error.message || 'Could not read editorial memory (missing memory table?)',
      missing_sql: ['database/ao_editorial_memory_items.sql']
    });
  }

  const rows = Array.isArray(memOut.data) ? memOut.data : [];
  const byTag = {};
  for (const r of rows) {
    const tags = Array.isArray(r?.topic_tags) ? r.topic_tags : [];
    for (const t of tags) {
      const k = String(t || '').trim();
      if (!k) continue;
      byTag[k] = (byTag[k] || 0) + 1;
    }
  }
  const coverage = { windowDays, since, totalPosts: rows.length, byTag };

  // Pull tags you've manually rated as "good" to bias future chasing.
  let goodTags = [];
  try {
    const goodSince = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const goodOut = await supabaseAdmin
      .from('ao_editorial_memory_items')
      .select('topic_tags')
      .eq('created_by_email', email)
      .eq('kind', 'social_post')
      .eq('feedback_rating', 'good')
      .gte('published_at', goodSince)
      .limit(200);
    if (!goodOut.error) {
      const set = new Set();
      for (const r of Array.isArray(goodOut.data) ? goodOut.data : []) {
        for (const t of Array.isArray(r?.topic_tags) ? r.topic_tags : []) {
          const k = String(t || '').trim();
          if (!k) continue;
          set.add(k);
        }
      }
      goodTags = Array.from(set).slice(0, 50);
    }
  } catch (_) {}

  const list = generateChaseListMvp({ beatPriorities, coverage, goodTags });

  // Replace active list.
  await supabaseAdmin
    .from('ao_scout_chase_list')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('created_by_email', email)
    .eq('status', 'active');

  const insertRows = list.map((x) => ({
    created_by_email: email,
    topic: x.topic,
    why: x.why || null,
    priority: x.priority ?? 50,
    expires_at: x.expires_at || null,
    status: 'active',
    updated_at: new Date().toISOString(),
  }));

  const ins = await supabaseAdmin.from('ao_scout_chase_list').insert(insertRows).select('id,topic,why,priority,expires_at,status,updated_at,created_at');
  if (ins.error) {
    return res.status(500).json({
      ok: false,
      error: ins.error.message || 'Could not save chase list (missing table?)',
      missing_sql: ['database/ao_scout_chase_list.sql']
    });
  }

  return res.status(200).json({ ok: true, windowDays, generated: insertRows.length, chase: ins.data || [] });
}

