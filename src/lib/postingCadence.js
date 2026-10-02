/**
 * The browser copy of the posting cadence rules.
 *
 * The canonical version is lib/ao/postingCadence.js, which is server side and
 * cannot be imported into the bundle. Only the two date helpers are duplicated,
 * and lib/__tests__/postingCadence.test.js holds both copies to the same answers
 * so they cannot drift apart unnoticed.
 */

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
 * The day a new run of cards should start so it continues an existing stream
 * without a gap and without doubling up.
 *
 * Bart, 2026-10-02: "I need to make sure no quote cards are missed when the
 * current stream empties." Defaulting to tomorrow put new cards on top of ones
 * already scheduled; this carries on from the last one instead.
 */
export function nextOpenCardDay(lastScheduledAt, gapDays = QUOTE_CARD_GAP_DAYS) {
  const last = lastScheduledAt ? new Date(lastScheduledAt) : null;
  if (!last || Number.isNaN(last.getTime())) {
    return nextWeekday(addBusinessDays(new Date(), 1));
  }
  const fromLast = addBusinessDays(last, gapDays);
  const notBeforeTomorrow = nextWeekday(addBusinessDays(new Date(), 1));
  return fromLast.getTime() > notBeforeTomorrow.getTime() ? fromLast : notBeforeTomorrow;
}
