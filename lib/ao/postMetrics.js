/**
 * Per-post metrics (Supabase) → suggested hour-of-day for scheduling.
 * Ingest via POST /api/ao/publishing/post-metrics or future channel API sync jobs.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { benchmarkHourForPlatforms, normalizePlatformKey } from './scheduleBenchmarks.js';

const MIN_SAMPLES = 3;

function computeEngagementScore(m) {
  if (m == null || typeof m !== 'object') return null;
  if (m.engagement_score != null && Number.isFinite(Number(m.engagement_score))) {
    return Number(m.engagement_score);
  }
  const imp = Number(m.impressions) || 0;
  const clk = Number(m.clicks) || 0;
  const react = Number(m.reactions) || 0;
  const com = Number(m.comments) || 0;
  const shr = Number(m.shares) || 0;
  const s = react * 3 + com * 4 + shr * 3 + clk * 2 + imp * 0.001;
  return s > 0 ? s : null;
}

/**
 * Upsert metrics for a scheduled post (usually after publish + API fetch, or manual entry).
 * @param {object} row
 * @param {string} row.scheduled_post_id
 * @param {string} row.platform
 * @param {string} [row.external_id]
 * @param {string} [row.posted_at_utc] - ISO; if omitted, loaded from ao_scheduled_posts.posted_at
 * @param {object} [row.raw]
 */
export async function upsertScheduledPostMetrics(row) {
  const scheduled_post_id = String(row.scheduled_post_id || '').trim();
  const platform = normalizePlatformKey(row.platform);
  if (!scheduled_post_id || !['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
    return { ok: false, error: 'scheduled_post_id and platform required' };
  }

  let posted_at_utc = row.posted_at_utc ? String(row.posted_at_utc) : null;
  if (!posted_at_utc) {
    const { data: sp } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('posted_at, scheduled_at')
      .eq('id', scheduled_post_id)
      .maybeSingle();
    posted_at_utc = sp?.posted_at || sp?.scheduled_at || new Date().toISOString();
  }

  const impressions = row.impressions != null ? Number(row.impressions) : null;
  const clicks = row.clicks != null ? Number(row.clicks) : null;
  const reactions = row.reactions != null ? Number(row.reactions) : null;
  const comments = row.comments != null ? Number(row.comments) : null;
  const shares = row.shares != null ? Number(row.shares) : null;
  const engagement_score =
    row.engagement_score != null && Number.isFinite(Number(row.engagement_score))
      ? Number(row.engagement_score)
      : computeEngagementScore({ impressions, clicks, reactions, comments, shares });

  const payload = {
    scheduled_post_id,
    platform,
    external_id: row.external_id != null ? String(row.external_id) : null,
    posted_at_utc,
    impressions: Number.isFinite(impressions) ? impressions : null,
    clicks: Number.isFinite(clicks) ? clicks : null,
    reactions: Number.isFinite(reactions) ? reactions : null,
    comments: Number.isFinite(comments) ? comments : null,
    shares: Number.isFinite(shares) ? shares : null,
    engagement_score: engagement_score != null && Number.isFinite(engagement_score) ? engagement_score : null,
    raw: row.raw && typeof row.raw === 'object' ? row.raw : null,
    synced_at: new Date().toISOString(),
  };

  const out = await supabaseAdmin.from('ao_scheduled_post_metrics').upsert(payload, {
    onConflict: 'scheduled_post_id',
  });
  if (out.error) return { ok: false, error: out.error.message };
  return { ok: true };
}

/**
 * Weighted best UTC hour from stored metrics for given platforms.
 * @param {string[]} platforms
 * @returns {number|null} hour 0–23 or null if insufficient data
 */
export async function inferPreferredHourUtcFromMetrics(platforms) {
  const want = [...new Set((platforms || []).map(normalizePlatformKey))].filter((p) =>
    ['linkedin', 'facebook', 'instagram', 'twitter'].includes(p)
  );
  if (!want.length) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('platform, posted_at_utc, engagement_score')
      .in('platform', want)
      .not('posted_at_utc', 'is', null);

    if (error) return null;
    const rows = Array.isArray(data) ? data : [];
    if (rows.length < MIN_SAMPLES) return null;

    const weightByHour = new Map();
    for (const r of rows) {
      const t = r.posted_at_utc ? new Date(r.posted_at_utc).getTime() : NaN;
      if (Number.isNaN(t)) continue;
      const h = new Date(r.posted_at_utc).getUTCHours();
      const raw = r.engagement_score != null ? Number(r.engagement_score) : NaN;
      const w = Number.isFinite(raw) && raw > 0 ? raw : 1;
      weightByHour.set(h, (weightByHour.get(h) || 0) + w);
    }
    if (weightByHour.size === 0) return null;

    let bestH = 14;
    let bestW = -1;
    for (const [h, w] of weightByHour) {
      if (w > bestW) {
        bestW = w;
        bestH = h;
      }
    }
    return bestH;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} platforms
 * @returns {Promise<{ hour: number, source: 'analytics' | 'benchmark' }>}
 */
export async function resolveSuggestedHourUtc(platforms) {
  const hinted = await inferPreferredHourUtcFromMetrics(platforms);
  if (hinted != null) return { hour: hinted, source: 'analytics' };
  return { hour: benchmarkHourForPlatforms(platforms), source: 'benchmark' };
}

/** @deprecated use resolveSuggestedHourUtc */
export function attachScheduledPostMetricsStub(_row) {
  return null;
}
