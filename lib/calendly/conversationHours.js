/**
 * Bart's conversation hours, and the rules Calendly cannot hold on its own.
 *
 * Bart, 2026-10-22:
 *   "Never Monday or Friday. Tuesday and Thursday 10-12 and 2-4.
 *    Wednesday 10-11:30 or 3-5. 4-6 max per week."
 *   "Both can be open, but the logic should block the morning if the afternoon
 *    gets booked and vice versa. I want protected time every day for
 *    production or writing."
 *   "I am central time."
 *
 * Calendly has weekly hours and a per-day limit, but no weekly limit and no
 * "one of these two windows" rule. So the weekly hours live here, and the
 * date-by-date blocks are worked out from what is already booked:
 *   - any booking on a Wednesday closes the rest of that Wednesday
 *   - once a week holds WEEKLY_CAP bookings, the rest of that week closes
 * The result is written to Calendly as the booking type's full rule set, so
 * running it again (on every booking, cancellation, and once a day) always
 * lands on the same answer.
 */

export const TIMEZONE = 'America/Chicago';

/** The ceiling Bart gave ("4-6 max per week"). */
export const WEEKLY_CAP = Number(process.env.CALENDLY_WEEKLY_CAP) || 6;

/** How far ahead to write date blocks; Calendly offers about this far out. */
export const WEEKS_AHEAD = 10;

export const WEEKLY_HOURS = {
  sunday: [],
  monday: [],
  tuesday: [
    { from: '10:00', to: '12:00' },
    { from: '14:00', to: '16:00' },
  ],
  wednesday: [
    { from: '10:00', to: '11:30' },
    { from: '15:00', to: '17:00' },
  ],
  thursday: [
    { from: '10:00', to: '12:00' },
    { from: '14:00', to: '16:00' },
  ],
  friday: [],
  saturday: [],
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** YYYY-MM-DD and weekday of an instant, in Central time. */
export function centralDate(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(new Date(instant));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, wday: String(get('weekday')).toLowerCase() };
}

/** Plain calendar arithmetic on YYYY-MM-DD, no time zones involved. */
function addDays(ymd, days) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday that starts the week holding this date. */
export function weekOf(ymd) {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

/**
 * Full rule set for a booking type: the weekly hours plus a closed day for
 * every date that should take no new bookings.
 *
 * @param {Array<{start_time: string}>} bookings active upcoming bookings (any type)
 * @param {Date} now
 */
export function buildRules(bookings, now = new Date(), { weeklyCap = WEEKLY_CAP, weeksAhead = WEEKS_AHEAD } = {}) {
  const today = centralDate(now).date;
  const perWeek = new Map();
  const bookedWednesdays = new Set();
  for (const b of bookings || []) {
    if (!b?.start_time) continue;
    const { date, wday } = centralDate(b.start_time);
    if (date < today) continue;
    const wk = weekOf(date);
    perWeek.set(wk, (perWeek.get(wk) || 0) + 1);
    if (wday === 'wednesday') bookedWednesdays.add(date);
  }

  const closed = new Set(bookedWednesdays);
  for (const [wk, count] of perWeek) {
    if (count < weeklyCap) continue;
    for (let i = 0; i < 7; i += 1) closed.add(addDays(wk, i));
  }

  const horizon = addDays(today, weeksAhead * 7);
  const dateRules = [...closed]
    .filter((d) => d >= today && d <= horizon)
    .filter((d) => {
      // Only days that would otherwise be open need a block.
      const wday = WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()];
      return WEEKLY_HOURS[wday].length > 0;
    })
    .sort()
    .map((date) => ({ type: 'date', date, intervals: [] }));

  const weekly = WEEKDAYS.map((wday) => ({ type: 'wday', wday, intervals: WEEKLY_HOURS[wday] }));
  return { timezone: TIMEZONE, rules: [...weekly, ...dateRules], closedDates: dateRules.map((r) => r.date), perWeek: Object.fromEntries(perWeek) };
}
