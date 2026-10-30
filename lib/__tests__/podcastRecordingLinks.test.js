/**
 * @jest-environment node
 *
 * Studio link emails (2026-10-30): every booked recording gets the Riverside
 * link five days before, once.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/podcastRecordingLinkEmail.js', () => ({ sendRecordingLinkEmail: jest.fn() }));
jest.mock('../ao/podcastGuestAuth.js', () => ({ getSiteUrl: () => 'https://www.archetypeoriginal.com' }));

import { isDue, studioLink, bartNoticeFor } from '../ao/podcastRecordingLinks.js';

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

describe('notices to Bart', () => {
  const prepped = { name: 'Matthew R Burgess', session_type: 'mentor', research_brief: 'x', suggested_questions: {}, producer_brief: 'x' };
  const base = { ...slot, recording_link_sent_at: '2026-11-05T15:00:00Z', guest: prepped };

  test('the day before: who, when, and what to read', () => {
    const n = bartNoticeFor(base, new Date('2026-11-09T15:00:00Z'));
    expect(n.kind).toBe('reminder');
    expect(n.subject).toMatch(/Tomorrow: mentor session with Matthew R Burgess/);
    expect(n.lines.join(' ')).toMatch(/read the producer brief/);
  });

  test('missing prep says to ask Cam', () => {
    const n = bartNoticeFor({ ...base, guest: { ...prepped, producer_brief: null } }, new Date('2026-11-09T15:00:00Z'));
    expect(n.lines.join(' ')).toMatch(/ask Cam/);
  });

  test('the morning after: notes, then the transcript', () => {
    const n = bartNoticeFor({ ...base, reminder_sent_at: 'x' }, new Date('2026-11-11T15:00:00Z'));
    expect(n.kind).toBe('followup');
    expect(n.lines[0]).toMatch(/Step 1/);
    expect(n.lines[1]).toMatch(/process this episode/);
    expect(n.cta.url).toMatch(/#post-recording$/);
  });

  test('a nudge three days on, only if notes are still missing, and only once', () => {
    const after = { ...base, reminder_sent_at: 'x', followup_sent_at: 'x' };
    expect(bartNoticeFor(after, new Date('2026-11-13T15:00:00Z')).kind).toBe('nudge');
    expect(bartNoticeFor({ ...after, guest: { ...prepped, post_recording_landed: 'yes' } }, new Date('2026-11-13T15:00:00Z'))).toBe(null);
    expect(bartNoticeFor({ ...after, nudge_sent_at: 'x' }, new Date('2026-11-13T15:00:00Z'))).toBe(null);
  });

  test('nothing on quiet days', () => {
    expect(bartNoticeFor(base, new Date('2026-11-07T15:00:00Z'))).toBe(null);
    expect(bartNoticeFor({ ...base, reminder_sent_at: 'x' }, new Date('2026-11-10T15:00:00Z'))).toBe(null);
  });
});
