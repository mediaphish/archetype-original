/**
 * @jest-environment node
 *
 * Studio link emails (2026-10-30): every booked recording gets the Riverside
 * link five days before, once.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/podcastRecordingLinkEmail.js', () => ({ sendRecordingLinkEmail: jest.fn() }));

import { isDue, studioLink } from '../ao/podcastRecordingLinks.js';

const slot = { guest_id: 'g1', scheduled_at: '2026-11-10T16:00:00Z', recording_link_sent_at: null };

test('due on the morning five calendar days before, not six', () => {
  expect(isDue(slot, new Date('2026-11-05T15:00:00Z'))).toBe(true);
  expect(isDue(slot, new Date('2026-11-04T15:00:00Z'))).toBe(false);
});

test('a booking inside five days is due right away', () => {
  expect(isDue(slot, new Date('2026-11-08T15:00:00Z'))).toBe(true);
});

test('never twice, never after, never without a guest', () => {
  expect(isDue({ ...slot, recording_link_sent_at: '2026-11-05T15:00:00Z' }, new Date('2026-11-06T15:00:00Z'))).toBe(false);
  expect(isDue(slot, new Date('2026-11-10T17:00:00Z'))).toBe(false);
  expect(isDue({ ...slot, guest_id: null }, new Date('2026-11-06T15:00:00Z'))).toBe(false);
});

test('the studio link comes from settings, not the code', () => {
  const prev = process.env.RIVERSIDE_STUDIO_URL;
  delete process.env.RIVERSIDE_STUDIO_URL;
  expect(studioLink()).toBe(null);
  process.env.RIVERSIDE_STUDIO_URL = ' https://riverside.com/studio/x ';
  expect(studioLink()).toBe('https://riverside.com/studio/x');
  if (prev === undefined) delete process.env.RIVERSIDE_STUDIO_URL; else process.env.RIVERSIDE_STUDIO_URL = prev;
});
