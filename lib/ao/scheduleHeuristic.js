/**
 * Memory-aware schedule suggestions: stagger channel posts using upcoming queue + minimum gaps.
 * Blends optional per-post metrics (ao_scheduled_post_metrics) with generic benchmarks when data is thin.
 */

import { resolveSuggestedLocalClock } from './postMetrics.js';
import { normalizePlatformKey, benchmarkMinuteDefault } from './scheduleBenchmarks.js';
import { getOwnerTimeZone, nextUtcAtOwnerLocalClock } from './ownerSchedule.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { PLATFORM_TIMES } from './unifiedScheduler.js';

const MIN_GAP_MS = 2 * 60 * 60 * 1000;

const CHANNEL_ORDER = ['linkedin', 'facebook', 'instagram', 'x'];

function normalizeChannelList(rawList) {
  const list = (Array.isArray(rawList) ? rawList : [rawList])
    .map((c) => String(c || '').trim().toLowerCase())
    .filter(Boolean);
  const want = new Set();
  for (const c of list) {
    if (c === 'x' || c === 'twitter') want.add('x');
    else if (['linkedin', 'facebook', 'instagram'].includes(c)) want.add(c);
    else if (normalizePlatformKey(c) === 'twitter') want.add('x');
  }
  if (!want.size) CHANNEL_ORDER.forEach((c) => want.add(c));
  return want;
}

/**
 * Per-channel ISO times for a packaged journal/social bundle.
 * @param {string[]} channels
 * @returns {Promise<Record<string, string>>}
 */
export async function buildScheduleSuggestionForChannels(channels = CHANNEL_ORDER) {
  const report = await getRecommendedSchedule({ channels, count: 1 });
  const out = {};
  for (const ch of CHANNEL_ORDER) {
    if (report.channels?.[ch]?.scheduled_at) out[ch] = report.channels[ch].scheduled_at;
  }
  return out;
}

/**
 * Analytics-grounded schedule recommendation for chat + Publishing UI.
 * Always returns explicit source per platform: engagement_data | fallback_insufficient_data.
 *
 * @param {{ platforms?: string|string[], channels?: string[], count?: number }} opts
 */
export async function getRecommendedSchedule(opts = {}) {
  const want = normalizeChannelList(opts.platforms ?? opts.channels ?? CHANNEL_ORDER);
  const count = Math.max(1, Math.min(10, Number(opts.count) || 1));

  const now = new Date();
  const { data } = await scheduledPosts()
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1);

  const lastFuture = data?.[0]?.scheduled_at ? new Date(data[0].scheduled_at) : null;
  let nextMs = Math.max(
    now.getTime() + MIN_GAP_MS,
    lastFuture ? lastFuture.getTime() + MIN_GAP_MS : now.getTime() + MIN_GAP_MS
  );

  const tz = getOwnerTimeZone();
  const channels = {};

  for (const ch of CHANNEL_ORDER) {
    if (!want.has(ch)) continue;
    const plat = normalizePlatformKey(ch);
    const clock = await resolveSuggestedLocalClock([plat]);
    const minute = Number.isFinite(clock.minute) ? clock.minute : benchmarkMinuteDefault();

    let slot = nextUtcAtOwnerLocalClock(new Date(nextMs), clock.hour, minute, tz);
    if (slot.getTime() <= now.getTime()) {
      slot = nextUtcAtOwnerLocalClock(new Date(now.getTime() + MIN_GAP_MS), clock.hour, minute, tz);
    }

    const slots = [];
    let cursor = new Date(slot);
    for (let i = 0; i < count; i += 1) {
      slots.push(cursor.toISOString());
      cursor = new Date(cursor.getTime() + MIN_GAP_MS);
    }

    nextMs = slot.getTime() + MIN_GAP_MS;

    const fallbackUtc = PLATFORM_TIMES[plat] || PLATFORM_TIMES.linkedin;
    channels[ch] = {
      platform: plat,
      channel: ch,
      local_hour: clock.hour,
      local_minute: minute,
      scheduled_at: slots[0],
      slots,
      source: clock.source,
      sample_count: clock.sample_count ?? 0,
      fallback_utc_time: String(fallbackUtc).slice(0, 5),
      owner_timezone: tz,
    };
  }

  let metrics_sync = null;
  try {
    const { getMetricsSyncHealth } = await import('./postMetrics.js');
    metrics_sync = await getMetricsSyncHealth();
  } catch (_) {
    metrics_sync = null;
  }

  return {
    ok: true,
    owner_timezone: tz,
    channels,
    metrics_sync,
    note:
      'When source is engagement_data, times reflect weighted engagement from ao_scheduled_post_metrics. When source is fallback_insufficient_data, times use the canonical PLATFORM_TIMES / owner-local benchmark — say so plainly to Bart. If metrics_sync.has_alert is true, tell Bart that platform\'s engagement numbers are not updating.',
  };
}
