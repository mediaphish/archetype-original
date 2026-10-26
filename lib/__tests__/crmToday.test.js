/**
 * @jest-environment node
 *
 * Auto > CRM (Bart, 2026-10-25): "open the page, know what to do." Today is one
 * ranked list built from what is on record, and nothing in it is invented.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/textModel.js', () => ({ completeText: jest.fn(async () => ''), completeJson: jest.fn(async () => null) }));

import { buildTodayItems, relationshipOf, sourceOf, nextStepOf, replyOwed, crmRow } from '../calendly/crm.js';

const NOW = Date.parse('2026-10-26T15:00:00Z'); // Monday 10 AM Chicago
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

const person = (over = {}) => ({
  email: 'pat@example.com',
  name: 'Pat Doe',
  stage: 'contact',
  tier: null,
  sessions: [],
  events: [],
  needs: [],
  next_moves: [],
  quiet: null,
  health: null,
  record: null,
  test: false,
  ...over,
});

describe('what someone is to Bart', () => {
  test('an explicit choice wins', () => {
    expect(relationshipOf(person({ tier: 'season', record: { crm: { relationship: 'partner' } } }))).toBe('partner');
  });
  test('otherwise it follows the record', () => {
    expect(relationshipOf(person({ tier: 'season' }))).toBe('client');
    expect(relationshipOf(person({ record: { flags: { podcast_guest: { track: 'guest' } } } }))).toBe('podcast_guest');
    expect(relationshipOf(person({ record: { flags: { podcast_guest: { track: 'mentor session' } } } }))).toBe('mentee');
    expect(relationshipOf(person({ sessions: [{ id: 1 }] }))).toBe('prospect');
    expect(relationshipOf(person())).toBe('contact');
  });
  test('podcast sign-ups came from the podcast', () => {
    expect(sourceOf(person({ record: { flags: { podcast_guest: {} } } }))).toBe('podcast');
    expect(sourceOf(person())).toBe(null);
  });
  test('a next step with an unknown owner belongs to Bart', () => {
    expect(nextStepOf(person({ record: { crm: { next_step: { what: 'Call', owner: 'stranger' } } } })).owner).toBe('bart');
    expect(nextStepOf(person({ record: { crm: { next_step: { what: '  ' } } } }))).toBe(null);
  });
});

describe('a reply owed', () => {
  test('owed when they wrote last', () => {
    const p = person({ events: [{ kind: 'email_out', at: iso(NOW - 5 * DAY) }, { kind: 'reply', at: iso(NOW - 2 * DAY), subject: 'Re: hello' }] });
    expect(replyOwed(p, NOW)).toEqual({ at: iso(NOW - 2 * DAY), days: 2, subject: 'Re: hello' });
  });
  test('not owed once Bart wrote back, or after a month', () => {
    expect(replyOwed(person({ events: [{ kind: 'reply', at: iso(NOW - 2 * DAY) }, { kind: 'email_out', at: iso(NOW - DAY) }] }), NOW)).toBe(null);
    expect(replyOwed(person({ events: [{ kind: 'reply', at: iso(NOW - 40 * DAY) }] }), NOW)).toBe(null);
  });
});

describe('Today', () => {
  test('emails to approve and team questions come first', () => {
    const items = buildTodayItems({
      people: [person({ quiet: { days: 40 } })],
      emailsWaiting: [{ id: 'e1', agent_name: 'Cam', to_name: 'Matt', to_email: 'm@example.com', subject: 'Prep' }],
      teamQuestions: [{ id: 't1', agent_name: 'Reach', question: 'Which day?' }],
      now: NOW,
    });
    expect(items.map((i) => i.kind)).toEqual(['approve_email', 'answer_team', 'reach_out']);
  });
  test('only Bart\'s own next steps that are due show up', () => {
    const mine = person({ email: 'a@x.com', name: 'A', record: { crm: { next_step: { what: 'Send the deck', due: '2026-10-25', owner: 'bart' } } } });
    const later = person({ email: 'b@x.com', name: 'B', record: { crm: { next_step: { what: 'Later', due: '2026-11-20', owner: 'bart' } } } });
    const cams = person({ email: 'c@x.com', name: 'C', record: { crm: { next_step: { what: 'Prep', due: '2026-10-26', owner: 'producer' } } } });
    const items = buildTodayItems({ people: [mine, later, cams], now: NOW });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'next_step', title: 'Send the deck', priority: 1, email: 'a@x.com' });
  });
  test('a call today asks Bart to get ready', () => {
    const items = buildTodayItems({ people: [person({ next_conversation_at: iso(NOW + 3 * 60 * 60 * 1000) })], now: NOW });
    expect(items[0]).toMatchObject({ kind: 'prepare', priority: 1 });
    expect(items[0].title).toMatch(/^Get ready for Pat, today at 1:00 PM$/);
  });
  test('someone who wrote is not also listed as gone quiet', () => {
    const p = person({ quiet: { days: 50 }, events: [{ kind: 'reply', at: iso(NOW - DAY) }] });
    expect(buildTodayItems({ people: [p], now: NOW }).map((i) => i.kind)).toEqual(['reply']);
  });
  test('test records never show', () => {
    expect(buildTodayItems({ people: [person({ test: true, quiet: { days: 90 } })], now: NOW })).toEqual([]);
  });
  test('no em dashes in what Today says', () => {
    const items = buildTodayItems({
      people: [person({ quiet: { days: 40 }, next_moves: [{ kind: 'schedule_podcast', label: 'Schedule the podcast', why: 'They signed up.' }] })],
      unmatched: [{ topic: 'Call' }],
      now: NOW,
    });
    expect(JSON.stringify(items)).not.toMatch(/—/);
  });
});

describe('a row in People', () => {
  test('carries the CRM fields', () => {
    const r = crmRow(person({ phone: '555', last_contact_at: NOW - DAY, record: { crm: { source: 'talk' } } }), NOW);
    expect(r).toMatchObject({ email: 'pat@example.com', phone: '555', relationship: 'contact', source: 'talk', next_step: null, reply_owed: null, needs: 0 });
  });
});
