/**
 * When posts are allowed to land.
 *
 * Bart, 2026-10-02:
 *   "Quotes are every 3 days skipping weekends."
 *   "Reshares would be Monday Wednesday and Friday no weekends."
 *
 * Both schedulers used to count plain calendar days, so a three day gap landed
 * on a Saturday one time in three, and the reshare day came from whichever
 * weekday the engagement numbers liked, which let a cadence he had decided on
 * drift week by week. The rules live here now rather than inside each scheduler.
 *
 * The browser copy of nextWeekday and addBusinessDays lives in
 * src/lib/postingCadence.js, because this module is server side. A test holds
 * the two to the same answers.
 */

/** Monday, Wednesday, Friday. */
export const RESHARE_DAYS = [1, 3, 5];

/** The gap between quote cards, counted in working days. */
export const QUOTE_CARD_GAP_DAYS = 3;

/** The same day, or the next one that is not a weekend. */
export function nextWeekday(date) {
  const d = new Date(date.getTime());
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

/** Step forward by whole working days, so the weekend is not part of the count. */
export function addBusinessDays(date, days) {
  const d = new Date(date.getTime());
  let left = Math.max(1, days);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left -= 1;
  }
  return d;
}

/**
 * The dates a run of cards would land on, starting from `start` and leaving
 * `gapDays` working days between each.
 */
export function slotsSkippingWeekends(start, count, gapDays = QUOTE_CARD_GAP_DAYS) {
  const slots = [];
  let cursor = nextWeekday(start);
  for (let i = 0; i < count; i += 1) {
    slots.push(new Date(cursor.getTime()));
    cursor = addBusinessDays(cursor, gapDays);
  }
  return slots;
}

/** The next Monday, Wednesday or Friday strictly after the given day. */
export function nextReshareDay(from) {
  const d = new Date(from.getTime());
  do {
    d.setDate(d.getDate() + 1);
  } while (!RESHARE_DAYS.includes(d.getDay()));
  return d;
}
