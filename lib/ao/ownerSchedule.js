/**
 * Owner-local wall time → UTC for ao_scheduled_posts.scheduled_at.
 * Vercel runs in UTC; schedule code must not treat "10:30" as UTC when the intent is Central (etc.).
 */

import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export function getOwnerTimeZone() {
  const z = String(process.env.AO_OWNER_TIMEZONE || 'America/Chicago').trim();
  return z || 'America/Chicago';
}

/**
 * Next UTC instant >= minUtc where local clock in owner TZ is hour:minute (0–23, 0–59).
 * @param {Date|string|number} minUtc
 * @param {number} hour
 * @param {number} minute
 * @param {string} [timeZone]
 * @returns {Date}
 */
export function nextUtcAtOwnerLocalClock(minUtc, hour, minute, timeZone) {
  const tz = timeZone || getOwnerTimeZone();
  const min = minUtc instanceof Date ? minUtc : new Date(minUtc);
  let dayStr = formatInTimeZone(min, tz, 'yyyy-MM-dd');

  for (let i = 0; i < 400; i += 1) {
    const [y, mo, d] = dayStr.split('-').map(Number);
    const naive = new Date(y, mo - 1, d, hour, minute, 0);
    const utc = fromZonedTime(naive, tz);
    if (utc.getTime() >= min.getTime()) return utc;
    const noonUtc = fromZonedTime(new Date(y, mo - 1, d, 12, 0, 0), tz);
    dayStr = formatInTimeZone(addDays(noonUtc, 1), tz, 'yyyy-MM-dd');
  }
  return new Date(min.getTime() + 60 * 60 * 1000);
}

/**
 * Format an ISO UTC time for display in owner zone (for chat copy).
 * @param {string|Date} isoOrDate
 * @param {string} [timeZone]
 * @returns {string}
 */
export function formatScheduledAtInOwnerZone(isoOrDate, timeZone) {
  const tz = timeZone || getOwnerTimeZone();
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(String(isoOrDate));
  if (Number.isNaN(d.getTime())) return '—';
  return formatInTimeZone(d, tz, "MMM d, yyyy 'at' h:mm a zzz");
}
