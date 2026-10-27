/**
 * @jest-environment node
 *
 * Bart, 2026-10-27: "An IT role that would only monitor setup and
 * functionality. Anytime something is broken or disconnected it would create
 * a report ... Bit would be his name."
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { expiryCheck, stuckPostsCheck, failedPostsCheck, overdueJournalsCheck, stuckTasksCheck, changesWorthTelling } from '../ao/team/bit.js';
import { AGENTS, personaPreamble, mentionedAgents, teamRosterBlock } from '../ao/team/agents.js';

const now = Date.parse('2026-10-27T22:00:00Z');

test('connections that run out are caught before they do', () => {
  expect(expiryCheck('linkedin', 'LinkedIn', '2026-12-18T21:04:03Z', { now }).status).toBe('ok');
  expect(expiryCheck('linkedin', 'LinkedIn', '2026-11-05T00:00:00Z', { now })).toMatchObject({ status: 'warn' });
  const gone = expiryCheck('linkedin', 'LinkedIn', '2026-10-20T00:00:00Z', { now });
  expect(gone.status).toBe('broken');
  expect(gone.detail).toMatch(/Reconnect it/);
  expect(gone.for_claude).toMatch(/expired/);
});

test('late and failed posts, overdue journals and stuck work are reported', () => {
  expect(stuckPostsCheck([{ id: 'a', status: 'scheduled', platform: 'x', scheduled_at: '2026-10-27T20:00:00Z' }], { now }).status).toBe('broken');
  expect(stuckPostsCheck([{ id: 'a', status: 'scheduled', platform: 'x', scheduled_at: '2026-10-27T21:50:00Z' }], { now }).status).toBe('ok');
  expect(failedPostsCheck([{ id: 'b', status: 'failed', platform: 'linkedin', updated_at: '2026-10-26T00:00:00Z', error_message: 'token expired' }], { now }).for_claude).toMatch(/token expired/);
  expect(overdueJournalsCheck([{ slug: 'x', title: 'X', scheduled_publish_at: '2026-10-27T12:00:00Z', published_at: null, status: 'approved' }], { now }).status).toBe('broken');
  expect(stuckTasksCheck([{ id: 't', title: 'Draft', status: 'running', heartbeat_at: '2026-10-27T20:00:00Z' }], { now }).status).toBe('warn');
});

test('Bart hears only about changes: newly broken, worse, or fixed', () => {
  const prev = [{ key: 'a', status: 'ok' }, { key: 'b', status: 'broken' }, { key: 'c', status: 'warn' }];
  const cur = [{ key: 'a', status: 'broken' }, { key: 'b', status: 'ok' }, { key: 'c', status: 'broken' }, { key: 'd', status: 'ok' }];
  const { newlyWrong, fixed } = changesWorthTelling(prev, cur);
  expect(newlyWrong.map((c) => c.key)).toEqual(['a', 'c']);
  expect(fixed.map((c) => c.key)).toEqual(['b']);
  expect(changesWorthTelling([{ key: 'a', status: 'broken' }], [{ key: 'a', status: 'broken' }]).newlyWrong).toEqual([]);
});

test('Bit is on the team, checks before he speaks, and never fixes things himself', () => {
  expect(AGENTS.it).toMatchObject({ name: 'Bit', role: 'IT' });
  expect(mentionedAgents('@Bit are my channels working?')).toEqual(['it']);
  const p = personaPreamble('it');
  expect(p).toMatch(/Call bit_check before saying anything about whether something works/);
  expect(p).toMatch(/you do not fix code/);
  expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/name: 'bit_check'/);
  expect(readFileSync('lib/ao/autoToolHandlers.js', 'utf8')).toMatch(/case 'bit_check'/);
  const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
  expect(v.crons.some((c) => c.path === '/api/cron/ao/bit')).toBe(true);
  expect(v.routes.some((r) => r.src === '/api/cron/ao/bit')).toBe(true);
});

test('the whole team offers video, one specific idea at a time', () => {
  expect(teamRosterBlock()).toMatch(/Lead Bart toward video/);
  expect(teamRosterBlock()).toMatch(/one offer at a time, never a list/);
});
