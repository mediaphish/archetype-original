/**
 * Per-post metrics (Supabase) → suggested hour-of-day for scheduling.
 * Ingest via POST /api/ao/publishing/post-metrics or future channel API sync jobs.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { supabaseAdmin } from '../supabase-admin.js';
import { benchmarkHourForPlatforms, benchmarkMinuteDefault, normalizePlatformKey } from './scheduleBenchmarks.js';
import { getOwnerTimeZone } from './ownerSchedule.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import {
  getPlatformTimingExternalGuidance,
  getThinSampleThreshold,
} from './platformTimingGuidance.js';

const MIN_SAMPLES = 3;
export { MIN_SAMPLES as METRICS_MIN_SAMPLES };

/**
 * Count scored metric rows for platforms (same filter as hour inference).
 */
export async function countMetricsSamples(platforms) {
  const want = [...new Set((platforms || []).map(normalizePlatformKey))].filter((p) =>
    ['linkedin', 'facebook', 'instagram', 'twitter'].includes(p)
  );
  if (!want.length) return 0;
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('platform, posted_at_utc, engagement_score')
      .in('platform', want)
      .not('posted_at_utc', 'is', null);
    if (error) return 0;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

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
    const { data: sp } = await scheduledPosts()
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
 * Weighted best **owner-local** hour from stored metrics for given platforms.
 * @param {string[]} platforms
 * @returns {number|null} hour 0–23 local or null if insufficient data
 */
export async function inferPreferredLocalHourFromMetrics(platforms) {
  const tz = getOwnerTimeZone();
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
      const h = Number(formatInTimeZone(new Date(r.posted_at_utc), tz, 'H'));
      if (!Number.isFinite(h)) continue;
      const raw = r.engagement_score != null ? Number(r.engagement_score) : NaN;
      const w = Number.isFinite(raw) && raw > 0 ? raw : 1;
      weightByHour.set(h, (weightByHour.get(h) || 0) + w);
    }
    if (weightByHour.size === 0) return null;

    let bestH = 10;
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

/** Test-only override for resolveSuggestedLocalClock. */
let resolveSuggestedLocalClockTestOverride = null;
export function __setResolveSuggestedLocalClockTestOverride(fn) {
  resolveSuggestedLocalClockTestOverride = typeof fn === 'function' ? fn : null;
}

/**
 * Suggested local clock (owner TZ) for scheduling.
 * @param {string[]} platforms
 * @returns {Promise<{
 *   hour: number,
 *   minute: number,
 *   source: string,
 *   sample_count: number,
 *   external_reference?: string|null,
 * }>}
 */
export async function resolveSuggestedLocalClock(platforms) {
  if (resolveSuggestedLocalClockTestOverride) {
    return resolveSuggestedLocalClockTestOverride(platforms);
  }
  const sample_count = await countMetricsSamples(platforms);
  const hinted = await inferPreferredLocalHourFromMetrics(platforms);
  const minute = benchmarkMinuteDefault();
  const thin = sample_count < getThinSampleThreshold();
  const plat = Array.isArray(platforms) && platforms[0] ? String(platforms[0]).toLowerCase() : 'linkedin';

  if (hinted != null && !thin) {
    return {
      hour: hinted,
      minute,
      source: 'engagement_data',
      sample_count,
      external_reference: null,
    };
  }

  if (hinted != null && thin) {
    const external = await getPlatformTimingExternalGuidance(plat);
    return {
      hour: hinted,
      minute,
      source: 'engagement_data_thin_supplemented',
      sample_count,
      external_reference: external || null,
    };
  }

  if (thin) {
    const external = await getPlatformTimingExternalGuidance(plat);
    return {
      hour: benchmarkHourForPlatforms(platforms),
      minute,
      source: external
        ? 'fallback_insufficient_data_supplemented'
        : 'fallback_insufficient_data',
      sample_count,
      external_reference: external || null,
    };
  }

  return {
    hour: benchmarkHourForPlatforms(platforms),
    minute,
    source: 'fallback_insufficient_data',
    sample_count,
    external_reference: null,
  };
}

/** @deprecated use resolveSuggestedLocalClock */
export async function resolveSuggestedHourUtc(platforms) {
  const c = await resolveSuggestedLocalClock(platforms);
  return { hour: c.hour, source: c.source };
}

/** @deprecated use resolveSuggestedHourUtc */
export function attachScheduledPostMetricsStub(_row) {
  return null;
}

/** Caption-length buckets aligned to the 125 / 800 research edges Auto already cites. */
export const CAPTION_LENGTH_BUCKETS = [
  { key: '0-125', min: 0, max: 125 },
  { key: '126-300', min: 126, max: 300 },
  { key: '301-500', min: 301, max: 500 },
  { key: '501-800', min: 501, max: 800 },
  { key: '800+', min: 801, max: Infinity },
];

export const CAPTION_LENGTH_MIN_SAMPLES = 5;
export const METRICS_SYNC_ALERT_CONSECUTIVE = 5;

export function captionCharLength(caption) {
  return Array.from(String(caption || '')).length;
}

export function captionLengthBucketKey(len) {
  const n = Math.max(0, Number(len) || 0);
  for (const b of CAPTION_LENGTH_BUCKETS) {
    if (n >= b.min && n <= b.max) return b.key;
  }
  return '800+';
}

function mean(nums) {
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 100) / 100;
}

/**
 * Pure aggregator for caption-length vs engagement. Skips rows whose last sync failed
 * so a permission error is not treated as a real zero-engagement score.
 */
export function aggregateCaptionLengthPerformance(rows, { minSamples = CAPTION_LENGTH_MIN_SAMPLES } = {}) {
  const byPlatform = {};
  for (const row of rows || []) {
    const platform = normalizePlatformKey(row?.platform);
    if (!['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) continue;
    if (!byPlatform[platform]) {
      byPlatform[platform] = { scored: [], skipped_sync_error: 0, skipped_unscored: 0 };
    }
    if (row?.sync_error) {
      byPlatform[platform].skipped_sync_error += 1;
      continue;
    }
    const score = Number(row?.engagement_score);
    if (!Number.isFinite(score)) {
      byPlatform[platform].skipped_unscored += 1;
      continue;
    }
    const caption = row?.caption || row?.text || '';
    byPlatform[platform].scored.push({
      bucket: captionLengthBucketKey(captionCharLength(caption)),
      score,
    });
  }

  const platforms = {};
  for (const platform of ['linkedin', 'facebook', 'instagram', 'twitter']) {
    const group = byPlatform[platform] || { scored: [], skipped_sync_error: 0, skipped_unscored: 0 };
    const bucketMap = {};
    for (const b of CAPTION_LENGTH_BUCKETS) bucketMap[b.key] = [];
    for (const item of group.scored) {
      if (!bucketMap[item.bucket]) bucketMap[item.bucket] = [];
      bucketMap[item.bucket].push(item.score);
    }
    const buckets = CAPTION_LENGTH_BUCKETS.map((b) => {
      const scores = bucketMap[b.key] || [];
      return {
        bucket: b.key,
        sample_count: scores.length,
        mean_engagement: mean(scores),
        too_few_samples: scores.length > 0 && scores.length < minSamples,
      };
    });
    const scored_count = group.scored.length;
    platforms[platform] = {
      scored_count,
      skipped_sync_error: group.skipped_sync_error,
      skipped_unscored: group.skipped_unscored,
      too_few_samples: scored_count > 0 && scored_count < minSamples,
      buckets,
    };
  }

  return platforms;
}

export function formatMetricsSyncAlert(platform, stats) {
  const label = platform === 'twitter' ? 'X' : String(platform || '').charAt(0).toUpperCase() + String(platform || '').slice(1);
  const latest = String(stats?.latest_error || '').trim();
  const partnerBlocked = /partnerApiSocialActions/i.test(latest);
  if (stats?.failing_all) {
    if (partnerBlocked) {
      return (
        `${label} engagement numbers are not updating. Every ${label} post failed to sync (${stats.failed} of ${stats.total}). ` +
        'LinkedIn is blocking the read: this connection can post, but cannot read likes and comments until LinkedIn grants a restricted permission. Reconnecting will not fix this.'
      );
    }
    return `${label} engagement numbers are not updating. Every ${label} post failed to sync (${stats.failed} of ${stats.total}). Latest error: ${latest || 'unknown'}`;
  }
  return (
    `${label} engagement numbers have failed to update on the last ${stats.consecutive_failed} posts ` +
    `(${stats.failed} of ${stats.total} total). Latest error: ${latest || 'unknown'}`
  );
}

/**
 * Pure summarizer. Alert if 5+ newest rows failed in a row, or 100% of a platform's rows failed.
 */
export function summarizeMetricsSyncHealth(rows) {
  const byPlatform = {};
  for (const r of rows || []) {
    const platform = normalizePlatformKey(r?.platform);
    if (!['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) continue;
    if (!byPlatform[platform]) byPlatform[platform] = [];
    byPlatform[platform].push(r);
  }

  const platforms = {};
  const alerts = [];
  for (const platform of ['linkedin', 'facebook', 'instagram', 'twitter']) {
    const list = byPlatform[platform] || [];
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a.synced_at || a.posted_at_utc || 0).getTime();
      const tb = new Date(b.synced_at || b.posted_at_utc || 0).getTime();
      return tb - ta;
    });
    const total = sorted.length;
    const failed = sorted.filter((r) => r?.sync_error).length;
    let consecutive_failed = 0;
    for (const r of sorted) {
      if (r?.sync_error) consecutive_failed += 1;
      else break;
    }
    const latest_error = sorted.find((r) => r?.sync_error)?.sync_error || null;
    const failing_all = total > 0 && failed === total;
    const alert =
      total > 0 && (consecutive_failed >= METRICS_SYNC_ALERT_CONSECUTIVE || failing_all);
    const stats = {
      total,
      failed,
      succeeded: total - failed,
      consecutive_failed,
      failing_all,
      latest_error,
      alert,
    };
    platforms[platform] = stats;
    if (alert) alerts.push(formatMetricsSyncAlert(platform, stats));
  }

  return {
    ok: true,
    platforms,
    alerts,
    has_alert: alerts.length > 0,
  };
}

async function defaultLoadCaptionMetricRows(platform) {
  let query = supabaseAdmin.from('ao_scheduled_post_metrics').select(`
      platform,
      engagement_score,
      sync_error,
      ao_scheduled_posts!inner(caption, text)
    `);
  const want = platform ? normalizePlatformKey(platform) : null;
  if (want && ['linkedin', 'facebook', 'instagram', 'twitter'].includes(want)) {
    query = query.eq('platform', want);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({
    platform: r.platform,
    engagement_score: r.engagement_score,
    sync_error: r.sync_error,
    caption: r.ao_scheduled_posts?.caption || r.ao_scheduled_posts?.text || '',
  }));
}

async function defaultLoadSyncRows() {
  const { data, error } = await supabaseAdmin
    .from('ao_scheduled_post_metrics')
    .select('platform, sync_error, synced_at, posted_at_utc');
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

/**
 * Join metrics to scheduled post captions and bucket by caption character length.
 */
export async function getCaptionLengthPerformance({ platform, loadRows, loadSyncRows } = {}) {
  try {
    const rows = loadRows ? await loadRows() : await defaultLoadCaptionMetricRows(platform);
    const platforms = aggregateCaptionLengthPerformance(rows);
    let metrics_sync = null;
    try {
      if (loadSyncRows) {
        metrics_sync = await getMetricsSyncHealth({ loadRows: loadSyncRows });
      } else if (loadRows) {
        metrics_sync = summarizeMetricsSyncHealth([]);
      } else {
        metrics_sync = await getMetricsSyncHealth();
      }
    } catch (_) {
      metrics_sync = null;
    }
    return {
      ok: true,
      min_samples_for_confidence: CAPTION_LENGTH_MIN_SAMPLES,
      platforms,
      metrics_sync,
      note:
        'mean_engagement is the average engagement_score in that caption-length bucket for this account. Relay the sample_count. If too_few_samples is true, say so plainly instead of asserting a winner. Do not treat general web research as this account\'s data.',
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function getMetricsSyncHealth({ loadRows } = {}) {
  try {
    const rows = loadRows ? await loadRows() : await defaultLoadSyncRows();
    return summarizeMetricsSyncHealth(rows);
  } catch (err) {
    return { ok: false, error: err?.message || String(err), platforms: {}, alerts: [], has_alert: false };
  }
}
