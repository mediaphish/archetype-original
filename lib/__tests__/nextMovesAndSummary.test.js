/**
 * @jest-environment node
 *
 * Suggested next moves and the Monday summary (2026-10-24). Auto suggests;
 * Bart decides. Test people never reach the summary.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../calendly/followups.js', () => ({ sendToBart: jest.fn() }));

import { nextMoves } from '../calendly/intelligence.js';
import { buildWeeklySummary } from '../calendly/weeklySummary.js';

const DAY = 86400000;
const now = Date.parse('2026-10-26T15:00:00Z');

test('gone quiet comes first, with something to ask', () => {
  const moves = nextMoves({ name: 'Jordan Test', quiet: { days: 24 }, thread: { open_questions: ['How the board vote went'] }, sessions: [] }, now);
  expect(moves[0]).toEqual({ kind: 'reach_out', label: 'Reach out to Jordan', why: 'Quiet for 24 days. Something to ask: How the board vote went' });
});

test('before a conversation this week, ask about what they did not finish', () => {
  const moves = nextMoves(
    {
      name: 'Riley',
      next_conversation_at: now + 2 * DAY,
      thread: { follow_through: { items: [{ item: 'Talk to Sam about the role', status: 'not_done', evidence: 'Said it had not happened.' }] } },
      sessions: [],
    },
    now
  );
  expect(moves[0].label).toMatch(/^Before Wednesday: ask how "Talk to Sam about the role" went$/);
});

test('met, nothing booked for over a week: a soft question, never more than three moves', () => {
  const moves = nextMoves(
    {
      name: 'Alex',
      stage: 'met',
      upcoming_dates: [{ label: 'Anniversary', days_away: 2, on: '2026-10-28' }],
      sessions: [{ scheduled_for: new Date(now - 10 * DAY).toISOString(), analysis: { action_items: { bart: ['Send the piece about the room'] }, next_time: [] } }],
    },
    now
  );
  expect(moves.map((m) => m.kind)).toEqual(['personal', 'your_promise', 'keep_going']);
});

test('the summary leaves test people out and is skipped when nobody real is there', () => {
  const home = {
    people: [{ name: 'Jordan Test', test: true }],
    needs: [{ name: 'Jordan Test', test: true, items: [{ label: 'Add the transcript' }] }],
    this_week: [],
    next_moves: [],
    coming_up: [],
    metrics: {},
  };
  expect(buildWeeklySummary(home, now)).toBeNull();
  home.people.push({ name: 'Real Person' });
  home.needs.push({ name: 'Real Person', items: [{ label: 'Send the follow-up' }] });
  const email = buildWeeklySummary(home, now);
  expect(email.subject).toBe('Your clients this week (October 26)');
  expect(email.html).toContain('Real Person: Send the follow-up.');
  expect(email.html).not.toContain('Jordan Test');
});
