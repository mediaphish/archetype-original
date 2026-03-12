/**
 * AO Automation — List quote review queue (pending first).
 * GET /api/ao/quotes/list
 *
 * Query:
 * - status: pending | held | approved | rejected | all (default: pending)
 * - limit: number (default: 10, max: 200)
 * - offset: number (default: 0)
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function clampInt(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isLeadershipRelevantRow(row) {
  const combined = [
    row?.source_title,
    row?.source_name,
    row?.source_excerpt,
    row?.raw_content,
    row?.quote_text,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!combined) return false;

  const strong = ['leadership', 'leader', 'management', 'manager', 'servant leadership', 'executive', 'workplace', 'organization', 'organisational'];
  const support = [
    'culture',
    'team',
    'accountability',
    'trust',
    'discipline',
    'strategy',
    'execution',
    'decision',
    'responsibility',
    'ownership',
    'integrity',
    'authority',
    'power',
    'coaching',
    'conflict',
    'collaboration',
    'communication',
    'psychological safety',
    'hiring',
    'performance',
  ];

  const hasStrong = strong.some((k) => combined.includes(k));
  const supportHits = support.reduce((n, k) => (combined.includes(k) ? n + 1 : n), 0);
  return hasStrong || supportHits >= 3;
}

async function expireOldPending() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('ao_quote_review_queue')
    .update({
      status: 'rejected',
      auto_discarded: true,
      discard_reason: 'Expired after 14 days',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('created_at', cutoff);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    // Keep Review usable: old pending items fall off after 14 days (unless held).
    await expireOldPending();

    const status = String(req.query?.status || 'pending').trim().toLowerCase();
    const limit = clampInt(req.query?.limit, 10, 1, 200);
    const offset = clampInt(req.query?.offset, 0, 0, 100000);

    let q = supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      q = q.eq('status', status);
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Aggressive cleanup: hide obvious off-topic external items immediately.
    // Better to return fewer items than show junk.
    const rows = Array.isArray(data) ? data : [];
    const keep = [];
    const toReject = [];
    for (const r of rows) {
      const isExternal = r && r.is_internal === false;
      if (isExternal && !isLeadershipRelevantRow(r)) {
        toReject.push(r.id);
        continue;
      }
      keep.push(r);
    }
    if (toReject.length) {
      try {
        await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({
            status: 'rejected',
            auto_discarded: true,
            discard_reason: 'Off-topic (not leadership-related)',
            updated_at: new Date().toISOString(),
          })
          .in('id', toReject);
      } catch (_) {}
    }

    return res.status(200).json({
      ok: true,
      quotes: keep,
      page: {
        status,
        limit,
        offset,
        total: typeof count === 'number' ? count : null,
      },
    });
  } catch (e) {
    console.error('[ao/quotes/list]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
