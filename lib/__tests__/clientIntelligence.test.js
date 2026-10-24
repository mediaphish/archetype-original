/**
 * @jest-environment node
 *
 * CRM intelligence (Bart, 2026-10-24): gone quiet so he cannot miss it, a
 * health meter that always says why, personal details that need his OK, and
 * his own numbers.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/textModel.js', () => ({ completeText: jest.fn(async () => ''), completeJson: jest.fn(async () => null) }));

import { quietness, computeHealth, upcomingDates, metrics, tierOf, quietDaysFor } from '../calendly/intelligence.js';
import { normalizeThread, mergeSuggestedDetails, threadPrompt, webWatchPrompt } from '../calendly/thread.js';

const DAY = 86400000;
const now = Date.parse('2026-11-20T12:00:00Z');
const session = (daysAgo, extra = {}) => ({ answers: { scheduled_for: new Date(now - daysAgo * DAY).toISOString(), ...extra } });
const person = (over = {}) => ({ stage: 'met', sessions: [session(30)], events: [], record: {}, thread: {}, ...over });

describe('gone quiet', () => {
  test('three weeks of silence flags a met client; ongoing flags at two', () => {
    expect(quietness(person(), now)).toMatchObject({ days: 30, limit: 21 });
    expect(quietness(person({ sessions: [session(15)] }), now)).toBe(null);
    expect(tierOf({ stage: 'ongoing' })).toBe('ongoing');
    expect(quietDaysFor({ stage: 'ongoing' })).toBe(14);
    expect(quietness(person({ stage: 'ongoing', sessions: [session(15)] }), now)).toMatchObject({ limit: 14 });
  });
  test('a booked conversation, a recent message, or Not now means not quiet', () => {
    expect(quietness(person({ sessions: [session(30), session(-3)] }), now)).toBe(null);
    expect(quietness(person({ events: [{ kind: 'checkin_sent', at: new Date(now - 5 * DAY).toISOString() }] }), now)).toBe(null);
    expect(quietness(person({ stage: 'not_now' }), now)).toBe(null);
  });
});

describe('health meter', () => {
  test('always 0 to 100, with reasons, and early until two transcripts', () => {
    const h = computeHealth(person(), now);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.reasons.length).toBeGreaterThanOrEqual(4);
    expect(h.early).toBe(true);
  });
  test('follow-through and momentum move it, and Bart can override', () => {
    const strong = computeHealth(person({ sessions: [session(3)], thread: { follow_through: { items: [{ item: 'a', status: 'done' }, { item: 'b', status: 'done' }] }, momentum: { direction: 'improving' } } }), now);
    const weak = computeHealth(person({ sessions: [session(60)], thread: { follow_through: { items: [{ item: 'a', status: 'not_done' }] }, momentum: { direction: 'slipping' } } }), now);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(weak.band).toBe('needs_attention');
    expect(computeHealth(person({ record: { health: { override: { score: 90, note: 'x' } } } }), now).score).toBe(90);
  });
});

describe('personal details', () => {
  test('Auto adds suggestions only, and never a duplicate', () => {
    const merged = mergeSuggestedDetails([{ id: 'd1', label: 'Birthday', status: 'confirmed' }], [{ kind: 'birthday', label: 'birthday' }, { kind: 'family', label: 'Wife Sarah, new baby' }]);
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({ status: 'suggested', source: 'conversation', label: 'Wife Sarah, new baby' });
  });
  test('confirmed dated details show up when they are close; suggestions do not', () => {
    const p = { record: { details: [
      { id: 'a', label: 'Birthday', date: '11-25', status: 'confirmed' },
      { id: 'b', label: 'Anniversary', date: '2019-12-30', status: 'confirmed' },
      { id: 'c', label: 'Guess', date: '11-21', status: 'suggested' },
    ] } };
    expect(upcomingDates(p, now).map((d) => [d.id, d.days_away])).toEqual([['a', 5]]);
  });
  test('the thread keeps only well-formed details and never invents dates', () => {
    const t = normalizeThread({ life_details: [{ kind: 'family', label: 'Wife postpartum', date: 'sometime' }, { kind: 'x', label: '' }], momentum: { direction: 'sideways' } });
    expect(t.life_details).toEqual([{ kind: 'family', label: 'Wife postpartum', date: '', note: '' }]);
    expect(t.momentum.direction).toBe('unknown');
  });
});

describe('the prompts hold Bart’s lines', () => {
  test('the thread is honest about his advice and does not invent', () => {
    const p = threadPrompt('Jordan', {}, [{ created_at: '2026-11-01', transcript: 'T', analysis: {} }]);
    expect(p).toMatch(/where_it_may_have_missed/);
    expect(p).toMatch(/Do not invent dates, names or events/);
  });
  test('the web watch stays professional and public', () => {
    expect(webWatchPrompt({ name: 'Jordan', email: 'j@acme.com' }, '2026-10-01')).toMatch(/Nothing about family, health, home or personal finances/);
  });
});

test('metrics leave test clients out and count income from seasons and ongoing', () => {
  const ppl = [
    { stage: 'season', sessions: [session(10)], health: { score: 70 } },
    { stage: 'ongoing', sessions: [session(5)], health: { score: 80 } },
    { stage: 'met', sessions: [session(40)], health: { score: 40 }, quiet: { days: 40 } },
    { stage: 'ongoing', test: true, sessions: [session(1)], health: { score: 10 } },
  ];
  const m = metrics(ppl, now);
  expect(m.monthly_income).toBe(4500);
  expect(m.active_clients).toBe(2);
  expect(m.conversion_rate).toBe(67);
  expect(m.gone_quiet).toBe(1);
  expect(m.average_health).toBe(63);
});

test('personal details are about their life, not their business', () => {
  const p = threadPrompt('Jordan', {}, [{ created_at: '2026-11-01', transcript: 'T', analysis: {} }]);
  expect(p).toMatch(/life_details are about their life, not their business/);
  expect(p).toMatch(/If nothing personal came up, return an empty list/);
});

test('people.js judges health from the raw bookings, where the dates live', () => {
  const src = require('node:fs').readFileSync('lib/calendly/people.js', 'utf8');
  expect(src).toMatch(/const judged = \{ \.\.\.person, sessions: rows \}/);
  expect(src).toMatch(/computeHealth\(judged, now\)/);
  expect(src).toMatch(/quietness\(judged, now\)/);
});
