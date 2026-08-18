/**
 * Shared scheduling helpers for ao_scheduled_posts.
 * findNextQueueDate may optionally filter by source_kind — journal launches must not
 * share a date queue with unrelated kinds like auto_quote_card (#128).
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { resolveSuggestedLocalClock } from './postMetrics.js';
import { normalizePlatformKey } from './scheduleBenchmarks.js';
import { getOwnerTimeZone, nextUtcAtOwnerLocalClock } from './ownerSchedule.js';
import { scheduledPosts } from '../db/scheduledPosts.js';

// Fixed UTC fallback when no engagement analytics exist for a platform yet
export const PLATFORM_TIMES = {
  linkedin: '15:00:00',
  instagram: '16:00:00',
  facebook: '18:00:00',
  twitter: '14:00:00',
};

/** Human-readable peak times for Auto prompts — always derived from PLATFORM_TIMES. */
export function formatPlatformTimesForPrompt() {
  const label = (plat, hhmmss) => {
    const hhmm = String(hhmmss || '').slice(0, 5);
    return `${plat} ${hhmm} UTC`;
  };
  return {
    linkedin: label('linkedin', PLATFORM_TIMES.linkedin),
    instagram: label('instagram', PLATFORM_TIMES.instagram),
    facebook: label('facebook', PLATFORM_TIMES.facebook),
    twitter: label('twitter', PLATFORM_TIMES.twitter),
    prose: `Default platform times (canonical fallback when engagement data is thin): linkedin ${String(PLATFORM_TIMES.linkedin).slice(0, 5)} UTC, instagram ${String(PLATFORM_TIMES.instagram).slice(0, 5)} UTC, facebook ${String(PLATFORM_TIMES.facebook).slice(0, 5)} UTC, twitter ${String(PLATFORM_TIMES.twitter).slice(0, 5)} UTC.`,
    connectedLines: [
      `- **LinkedIn Personal** — LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN. Fallback peak: ${String(PLATFORM_TIMES.linkedin).slice(0, 5)} UTC (use get_recommended_schedule for live data).`,
      `- **Instagram Business (@archetypeoriginal)** — META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ID. Fallback peak: ${String(PLATFORM_TIMES.instagram).slice(0, 5)} UTC (use get_recommended_schedule for live data).`,
      `- **Facebook Business** — META_ACCESS_TOKEN + FACEBOOK_PAGE_ID. Fallback peak: ${String(PLATFORM_TIMES.facebook).slice(0, 5)} UTC (use get_recommended_schedule for live data).`,
      `- **X (@archetypeog)** — TWITTER credentials. Fallback peak: ${String(PLATFORM_TIMES.twitter).slice(0, 5)} UTC (use get_recommended_schedule for live data).`,
    ].join('\n'),
  };
}

export function isWeekend(date) {
  const d = new Date(date);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function nextWeekday(date) {
  const d = new Date(date);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
}

export function addWeekdays(date, n) {
  const d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

/**
 * Build scheduled_at for a calendar day + platform.
 * Uses engagement analytics when available; falls back to fixed PLATFORM_TIMES UTC.
 *
 * @param {Date|string} date
 * @param {string} platform
 * @param {{ returnMeta?: boolean }} [opts]
 * @returns {Promise<string | { scheduled_at: string, source: string, sample_count: number, external_reference?: string|null, hour: number, minute: number }>}
 */
export async function toScheduledAt(date, platform, opts = {}) {
  const ymd = new Date(date).toISOString().split('T')[0];
  const plat = normalizePlatformKey(platform);

  const clock = await resolveSuggestedLocalClock([plat]);
  const useOwnerClock =
    clock.source === 'engagement_data' || clock.source === 'engagement_data_thin_supplemented';
  let scheduled_at;
  if (useOwnerClock) {
    const minUtc = new Date(`${ymd}T00:00:00.000Z`);
    const utc = nextUtcAtOwnerLocalClock(minUtc, clock.hour, clock.minute, getOwnerTimeZone());
    scheduled_at = utc.toISOString();
  } else {
    const time = PLATFORM_TIMES[plat] || PLATFORM_TIMES.linkedin;
    scheduled_at = new Date(`${ymd}T${time}+00:00`).toISOString();
  }

  scheduled_at = ensureFutureScheduledAt(scheduled_at, {
    hour: clock.hour,
    minute: clock.minute,
    useOwnerClock,
  });

  if (opts.returnMeta) {
    return {
      scheduled_at,
      source: clock.source,
      sample_count: clock.sample_count,
      external_reference: clock.external_reference || null,
      hour: clock.hour,
      minute: clock.minute,
    };
  }
  return scheduled_at;
}

/**
 * Find the next available weekday slot after the last scheduled post in the queue.
 * @param {number} weekdayGap - weekdays to add after the last scheduled post (default 3)
 * @param {{ sourceKinds?: string[] }} [opts] - when set, only consider those source_kind values
 *   (journal_launch must never share a queue with auto_quote_card / unrelated kinds)
 */
export async function findNextQueueDate(weekdayGap = 3, opts = {}) {
  let query = scheduledPosts()
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: false })
    .limit(1);

  const kinds = Array.isArray(opts.sourceKinds)
    ? opts.sourceKinds.map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  if (kinds.length === 1) {
    query = query.eq('source_kind', kinds[0]);
  } else if (kinds.length > 1) {
    query = query.in('source_kind', kinds);
  }

  const { data } = await query;

  if (data && data.length > 0) {
    const lastDate = new Date(data[0].scheduled_at);
    return addWeekdays(lastDate, weekdayGap);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return nextWeekday(tomorrow);
}

export function dateFromYmd(ymd) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : nextWeekday(d);
}

/** Same 2-hour floor used by getRecommendedSchedule — do not schedule into the past. */
export const SCHEDULE_MIN_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * If the computed slot is already past (or within the minimum gap), push it forward.
 * Owner-clock path uses the next matching local hour; UTC fallback advances by whole days.
 */
export function ensureFutureScheduledAt(
  scheduledAtIso,
  {
    now = new Date(),
    minGapMs = SCHEDULE_MIN_GAP_MS,
    hour = null,
    minute = null,
    useOwnerClock = false,
  } = {}
) {
  const t = new Date(scheduledAtIso).getTime();
  if (!Number.isFinite(t)) return scheduledAtIso;
  const floor = now.getTime() + minGapMs;
  if (t > floor) return scheduledAtIso;
  if (useOwnerClock && Number.isFinite(Number(hour)) && Number.isFinite(Number(minute))) {
    return nextUtcAtOwnerLocalClock(new Date(floor), Number(hour), Number(minute), getOwnerTimeZone()).toISOString();
  }
  let next = t;
  while (next <= floor) next += 24 * 60 * 60 * 1000;
  return new Date(next).toISOString();
}
