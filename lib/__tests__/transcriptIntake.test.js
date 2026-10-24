/**
 * @jest-environment node
 *
 * Transcripts that arrive on their own (2026-10-24): Zoom's are matched to the
 * booking by meeting number, then by time; a close call goes to Bart.
 */
import { createHmac } from 'crypto';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../calendly/followups.js', () => ({ markRow: jest.fn(), getBooking: jest.fn(), sendToBart: jest.fn() }));

import { zoomMeetingId, pickBooking } from '../calendly/transcriptIntake.js';
import { verifyZoom, isZoomDownload } from '../../api/zoom/webhook.js';

const at = (iso, extra = {}) => ({ id: iso, answers: { scheduled_for: iso, ...extra } });

test('the meeting number comes out of a Zoom join link', () => {
  expect(zoomMeetingId('https://us06web.zoom.us/j/81234567890?pwd=abc')).toBe('81234567890');
  expect(zoomMeetingId('https://calendly.com/x')).toBeNull();
});

test('matched by meeting number first, then by a clear start time', () => {
  const rows = [at('2026-10-27T15:00:00Z', { join_url: 'https://zoom.us/j/81234567890' }), at('2026-10-27T19:00:00Z')];
  expect(pickBooking(rows, { meetingId: '81234567890' }).id).toBe('2026-10-27T15:00:00Z');
  expect(pickBooking(rows, { startedAt: '2026-10-27T19:04:00Z' }).id).toBe('2026-10-27T19:00:00Z');
  expect(pickBooking(rows, { startedAt: '2026-10-28T19:00:00Z' })).toBeNull();
});

test('two bookings close together is not a match', () => {
  const rows = [at('2026-10-27T15:00:00Z'), at('2026-10-27T15:15:00Z')];
  expect(pickBooking(rows, { startedAt: '2026-10-27T15:05:00Z' })).toBeNull();
});

test('cancelled bookings are never matched', () => {
  expect(pickBooking([at('2026-10-27T15:00:00Z', { cancelled_at: 'x' })], { startedAt: '2026-10-27T15:00:00Z' })).toBeNull();
});

test('only Zoom-signed calls get in, and downloads only go to zoom.us', () => {
  const body = '{"event":"recording.transcript_completed"}';
  const ts = Math.floor(Date.now() / 1000);
  const sig = `v0=${createHmac('sha256', 's3').update(`v0:${ts}:${body}`).digest('hex')}`;
  expect(verifyZoom({ 'x-zm-request-timestamp': String(ts), 'x-zm-signature': sig }, body, 's3')).toBe(true);
  expect(verifyZoom({ 'x-zm-request-timestamp': String(ts), 'x-zm-signature': sig }, body, 'other')).toBe(false);
  expect(isZoomDownload('https://us06web.zoom.us/rec/download/abc')).toBe(true);
  expect(isZoomDownload('https://evil.example.com/zoom.us')).toBe(false);
});

describe('emailed transcripts (Wispr Flow, Echo)', () => {
  const { pickBookingForEmail, emailedSource } = jest.requireActual('../calendly/transcriptIntake.js');
  const row = (name, iso) => ({ id: name, name, answers: { scheduled_for: iso } });

  test('the one conversation in the six hours before it was sent', () => {
    const rows = [row('Jordan Lee', '2026-10-27T15:00:00Z'), row('Riley Park', '2026-10-26T15:00:00Z')];
    expect(pickBookingForEmail(rows, { sentAt: '2026-10-27T17:10:00Z' }).id).toBe('Jordan Lee');
  });

  test('with two that day, a first name in the subject decides; without one, Bart picks', () => {
    const rows = [row('Jordan Lee', '2026-10-27T14:00:00Z'), row('Riley Park', '2026-10-27T16:00:00Z')];
    expect(pickBookingForEmail(rows, { sentAt: '2026-10-27T18:00:00Z', subject: 'Riley call notes' }).id).toBe('Riley Park');
    expect(pickBookingForEmail(rows, { sentAt: '2026-10-27T18:00:00Z', subject: 'Transcript' })).toBeNull();
  });

  test('the recorder is noted when it says so', () => {
    expect(emailedSource('Wispr Flow transcript', '')).toBe('wispr');
    expect(emailedSource('From Echo', '')).toBe('echo');
    expect(emailedSource('notes', '')).toBe('email');
  });
});
