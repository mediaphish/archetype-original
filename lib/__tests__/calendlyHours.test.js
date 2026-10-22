/**
 * @jest-environment node
 *
 * Bart's conversation hours, 2026-10-22. Never Monday or Friday; Tue/Thu
 * 10-12 and 2-4; Wednesday 10-11:30 or 3-5, and a booking in one Wednesday
 * window closes the other; 6 a week at most; Central time.
 */
import { createHmac } from 'node:crypto';
import { buildRules, WEEKLY_HOURS, weekOf, centralDate } from '../calendly/conversationHours.js';
import { verifySignature } from '../../api/calendly/webhook.js';

const now = new Date('2026-10-26T14:00:00Z'); // Monday Oct 26, 9am Central

describe('weekly hours', () => {
  test('never Monday, Friday or the weekend', () => {
    for (const d of ['monday', 'friday', 'saturday', 'sunday']) expect(WEEKLY_HOURS[d]).toEqual([]);
  });
  test('Tuesday and Thursday 10-12 and 2-4, Wednesday 10-11:30 and 3-5', () => {
    const two = [{ from: '10:00', to: '12:00' }, { from: '14:00', to: '16:00' }];
    expect(WEEKLY_HOURS.tuesday).toEqual(two);
    expect(WEEKLY_HOURS.thursday).toEqual(two);
    expect(WEEKLY_HOURS.wednesday).toEqual([{ from: '10:00', to: '11:30' }, { from: '15:00', to: '17:00' }]);
  });
  test('rules are written in Central time', () => {
    expect(buildRules([], now).timezone).toBe('America/Chicago');
  });
});

describe('date blocks', () => {
  test('nothing booked, nothing closed', () => {
    expect(buildRules([], now).closedDates).toEqual([]);
  });

  test('a Wednesday morning booking closes that Wednesday afternoon', () => {
    // Wed Oct 28, 10:00 Central = 15:00 UTC
    const r = buildRules([{ start_time: '2026-10-28T15:00:00Z' }], now);
    expect(r.closedDates).toEqual(['2026-10-28']);
  });

  test('a Wednesday afternoon booking closes that Wednesday morning', () => {
    // Wed Oct 28, 15:00 Central = 20:00 UTC
    expect(buildRules([{ start_time: '2026-10-28T20:00:00Z' }], now).closedDates).toEqual(['2026-10-28']);
  });

  test('a Tuesday booking leaves the other Tuesday window open', () => {
    expect(buildRules([{ start_time: '2026-10-27T15:00:00Z' }], now).closedDates).toEqual([]);
  });

  test('six bookings close the rest of that week, and only that week', () => {
    const six = Array.from({ length: 6 }, () => ({ start_time: '2026-10-27T15:00:00Z' }));
    const r = buildRules(six, now);
    expect(r.closedDates).toEqual(['2026-10-27', '2026-10-28', '2026-10-29']);
    expect(r.closedDates).not.toContain('2026-11-03');
  });

  test('five bookings in a week do not close it', () => {
    const five = Array.from({ length: 5 }, () => ({ start_time: '2026-10-27T15:00:00Z' }));
    expect(buildRules(five, now).closedDates).toEqual([]);
  });

  test('a late-evening booking counts on its Central date, not its UTC date', () => {
    // Tue 9pm Central is Wednesday in UTC; it must not close Wednesday.
    expect(centralDate('2026-10-28T02:00:00Z').date).toBe('2026-10-27');
    expect(buildRules([{ start_time: '2026-10-28T02:00:00Z' }], now).closedDates).toEqual([]);
  });

  test('weeks start on Monday', () => {
    expect(weekOf('2026-10-29')).toBe('2026-10-26');
    expect(weekOf('2026-11-01')).toBe('2026-10-26');
  });
});

describe('booking listener', () => {
  test('accepts a correctly signed message and rejects anything else', () => {
    const key = 'test-key';
    const body = '{"event":"invitee.created"}';
    const t = 1_800_000_000;
    const v1 = createHmac('sha256', key).update(`${t}.${body}`).digest('hex');
    expect(verifySignature(`t=${t},v1=${v1}`, body, key, t)).toBe(true);
    expect(verifySignature(`t=${t},v1=${v1}`, body + ' ', key, t)).toBe(false);
    expect(verifySignature(`t=${t},v1=${v1}`, body, 'other', t)).toBe(false);
    expect(verifySignature(`t=${t},v1=${v1}`, body, key, t + 3600)).toBe(false);
    expect(verifySignature(undefined, body, key, t)).toBe(false);
  });
});
