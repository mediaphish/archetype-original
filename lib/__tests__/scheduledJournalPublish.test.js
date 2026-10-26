/**
 * @jest-environment node
 *
 * Journal posts go live at 6:00am Central (Bart, 2026-10-26: "Let's go with 6am
 * so it is fully ready by 8, which is when some socials will start rolling.").
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { parseScheduledPublishAt } from '../db/scheduledJournalPublish.js';

test('a date alone is 6:00am Central that day, before and after the clock change', () => {
  expect(parseScheduledPublishAt('2026-10-28').iso).toBe('2026-10-28T11:00:00.000Z'); // daylight time
  expect(parseScheduledPublishAt('2026-11-04').iso).toBe('2026-11-04T12:00:00.000Z'); // standard time
});

test('any time passed still becomes 6:00am Central on that day', () => {
  expect(parseScheduledPublishAt('2026-10-28T13:00:00Z').iso).toBe('2026-10-28T11:00:00.000Z'); // 8am CDT
  expect(parseScheduledPublishAt('2026-10-28T08:00:00-05:00').iso).toBe('2026-10-28T11:00:00.000Z');
  // Late evening UTC that is still the same Chicago day.
  expect(parseScheduledPublishAt('2026-10-29T03:00:00Z').iso).toBe('2026-10-28T11:00:00.000Z');
});

test('nonsense is refused', () => {
  expect(parseScheduledPublishAt('soon').ok).toBe(false);
  expect(parseScheduledPublishAt('').ok).toBe(false);
});
