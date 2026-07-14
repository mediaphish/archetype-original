/**
 * GET /api/ao/auto/reshare-review
 * Returns all pending reshare rows from ao_scheduled_posts grouped by entry.
 *
 * POST /api/ao/auto/reshare-review
 * Body: { action: 'approve' | 'discard', slug: string }
 *
 * approve: finds pending_review rows for this slug, computes scheduled_at
 *   times for this week using performance data, updates status to 'scheduled'
 *
 * discard: deletes pending_review rows for this slug, clears pending_review_ids
 *   on ao_reshare_queue, decrements reshare_count
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { toScheduledAt } from '../../../lib/ao/unifiedScheduler.js';

/**
 * Find the best day this week to schedule a reshare post.
 * Looks at the next 7 days, finds a weekday that does not already
 * have a reshare post, and picks the day with the highest historical
 * engagement based on day-of-week patterns.
 * Falls back to tomorrow if no data is available.
 */
async function findBestReshareDay() {
  const today = new Date();

  let bestDayOffset = 1; // default to tomorrow
  try {
    const { data: metrics } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('posted_at_utc, engagement_score')
      .not('posted_at_utc', 'is', null)
      .not('engagement_score', 'is', null)
      .gt('engagement_score', 0)
      .order('posted_at_utc', { ascending: false })
      .limit(60);

    if (metrics && metrics.length >= 5) {
      const dayScores = {};
      for (const m of metrics) {
        const d = new Date(m.posted_at_utc);
        const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        if (dow === 0 || dow === 6) continue;
        if (!dayScores[dow]) dayScores[dow] = { total: 0, count: 0 };
        dayScores[dow].total += Number(m.engagement_score);
        dayScores[dow].count += 1;
      }

      let bestDow = null;
      let bestAvg = -1;
      for (const [dow, { total, count }] of Object.entries(dayScores)) {
        const avg = total / count;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestDow = parseInt(dow, 10);
        }
      }

      if (bestDow !== null) {
        for (let offset = 1; offset <= 7; offset++) {
          const candidate = new Date(today);
          candidate.setDate(today.getDate() + offset);
          if (candidate.getDay() === bestDow) {
            bestDayOffset = offset;
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[reshare-review] Could not load metrics for day selection:', err?.message);
  }

  for (let attempt = 0; attempt < 7; attempt++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + bestDayOffset + attempt);
    const ymd = candidate.toISOString().split('T')[0];

    const dow = candidate.getDay();
    if (dow === 0 || dow === 6) continue;

    const { data: existing } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id')
      .eq('source_kind', 'ao_journal_reshare')
      .in('status', ['scheduled', 'pending_review'])
      .gte('scheduled_at', `${ymd}T00:00:00Z`)
      .lt('scheduled_at', `${ymd}T23:59:59Z`)
      .limit(1);

    if (!existing || existing.length === 0) {
      return candidate;
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const { data: pendingRows, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, caption, image_url, intent, scheduled_at')
      .eq('status', 'pending_review')
      .eq('source_kind', 'ao_journal_reshare')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const grouped = {};
    for (const row of pendingRows || []) {
      const slug = row.intent?.slug || 'unknown';
      if (!grouped[slug]) {
        grouped[slug] = {
          slug,
          title: row.intent?.title || slug,
          journal_url: row.intent?.journal_url || '',
          selection_reason: row.intent?.selection_reason || '',
          image_url: row.image_url || null,
          posts: [],
        };
      }
      grouped[slug].posts.push({
        id: row.id,
        platform: row.platform,
        caption: row.caption,
        scheduled_at: row.scheduled_at,
      });
    }

    return res.status(200).json({
      ok: true,
      pending: Object.values(grouped),
      total: Object.keys(grouped).length,
    });
  }

  if (req.method === 'POST') {
    const { action, slug } = req.body || {};

    if (!action || !slug) {
      return res.status(400).json({ ok: false, error: 'action and slug are required' });
    }

    if (action !== 'approve' && action !== 'discard') {
      return res.status(400).json({ ok: false, error: 'action must be approve or discard' });
    }

    const safeSlug = String(slug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: pendingRows, error: fetchError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, caption, image_url, intent')
      .eq('status', 'pending_review')
      .eq('source_kind', 'ao_journal_reshare')
      .filter('intent->>slug', 'eq', safeSlug);

    if (fetchError) {
      return res.status(500).json({ ok: false, error: fetchError.message });
    }

    if (!pendingRows || pendingRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: `No pending reshare found for slug: ${safeSlug}`,
      });
    }

    const ids = pendingRows.map((r) => r.id);

    if (action === 'discard') {
      const { error: deleteError } = await supabaseAdmin
        .from('ao_scheduled_posts')
        .delete()
        .in('id', ids);

      if (deleteError) {
        return res.status(500).json({ ok: false, error: deleteError.message });
      }

      const { data: queueEntry } = await supabaseAdmin
        .from('ao_reshare_queue')
        .select('reshare_count')
        .eq('slug', safeSlug)
        .single();

      await supabaseAdmin
        .from('ao_reshare_queue')
        .update({
          reshare_count: Math.max(0, (queueEntry?.reshare_count || 1) - 1),
          last_reshared_at: null,
          pending_review_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('slug', safeSlug);

      return res.status(200).json({
        ok: true,
        action: 'discard',
        slug: safeSlug,
        deleted: ids.length,
        message: `Reshare discarded. ${ids.length} pending posts removed.`,
      });
    }

    if (action === 'approve') {
      const scheduleDay = await findBestReshareDay();

      const updates = [];
      for (const row of pendingRows) {
        const scheduledAt = await toScheduledAt(scheduleDay, row.platform);
        updates.push(
          supabaseAdmin
            .from('ao_scheduled_posts')
            .update({
              status: 'scheduled',
              scheduled_at: scheduledAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
        );
      }

      await Promise.all(updates);

      await supabaseAdmin
        .from('ao_reshare_queue')
        .update({
          pending_review_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('slug', safeSlug);

      const scheduleDate = scheduleDay.toISOString().split('T')[0];
      console.log(`[reshare-review] Approved reshare for ${safeSlug} — scheduled for ${scheduleDate}`);

      return res.status(200).json({
        ok: true,
        action: 'approve',
        slug: safeSlug,
        schedule_date: scheduleDate,
        approved: ids.length,
        message: `${ids.length} posts scheduled for ${scheduleDate}.`,
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
