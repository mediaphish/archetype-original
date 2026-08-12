/**
 * Shared scheduling helpers for ao_scheduled_posts.
 * One queue across all content types — no source_kind filter when finding the next slot.
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
 */
export async function toScheduledAt(date, platform) {
  const ymd = new Date(date).toISOString().split('T')[0];
  const plat = normalizePlatformKey(platform);

  const clock = await resolveSuggestedLocalClock([plat]);
  if (clock.source === 'engagement_data') {
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
  const { data } = await scheduledPosts()
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
