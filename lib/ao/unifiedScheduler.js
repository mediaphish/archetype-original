/**
 * Shared scheduling helpers for ao_scheduled_posts.
 * One queue across all content types — no source_kind filter when finding the next slot.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { resolveSuggestedLocalClock } from './postMetrics.js';
import { normalizePlatformKey } from './scheduleBenchmarks.js';
import { getOwnerTimeZone, nextUtcAtOwnerLocalClock } from './ownerSchedule.js';

// Fixed UTC fallback when no engagement analytics exist for a platform yet
const PLATFORM_TIMES = {
  linkedin: '15:00:00',
  instagram: '16:00:00',
  facebook: '18:00:00',
  twitter: '14:00:00',
};

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
 */
export async function toScheduledAt(date, platform) {
  const ymd = new Date(date).toISOString().split('T')[0];
  const plat = normalizePlatformKey(platform);

  const clock = await resolveSuggestedLocalClock([plat]);
  if (clock.source === 'analytics') {
    const minUtc = new Date(`${ymd}T00:00:00.000Z`);
    const utc = nextUtcAtOwnerLocalClock(minUtc, clock.hour, clock.minute, getOwnerTimeZone());
    return utc.toISOString();
  }

  const time = PLATFORM_TIMES[plat] || PLATFORM_TIMES.linkedin;
  return new Date(`${ymd}T${time}+00:00`).toISOString();
}

/**
 * Find the next available weekday slot after the last scheduled post in the queue.
 * @param {number} weekdayGap - weekdays to add after the last scheduled post (default 3)
 */
export async function findNextQueueDate(weekdayGap = 3) {
  const { data } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: false })
    .limit(1);

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
