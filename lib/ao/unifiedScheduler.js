/**
 * Shared scheduling helpers for ao_scheduled_posts.
 * One queue across all content types — no source_kind filter when finding the next slot.
 */
import { supabaseAdmin } from '../supabase-admin.js';

// Peak times per platform (UTC) — must stay aligned with schedule-cards.js behavior
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

export function toScheduledAt(date, platform) {
  const ymd = new Date(date).toISOString().split('T')[0];
  const time = PLATFORM_TIMES[platform] || '15:00:00';
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
