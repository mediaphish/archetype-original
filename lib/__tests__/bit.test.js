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

// 2026-10-27, Bart: "I want the ability to tell Bit to send you a report outside of the schedule."
test('Bart can tell Bit to send the engineer a report any time', () => {
  expect(personaPreamble('it')).toMatch(/call bit_send_report with what he said in his words/);
  expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/name: 'bit_send_report'/);
  expect(readFileSync('lib/ao/autoToolHandlers.js', 'utf8')).toMatch(/case 'bit_send_report'/);
  const script = readFileSync('scripts/bit-repair.mjs', 'utf8');
  expect(script).toMatch(/cmd === 'pending'/);
  expect(script).toMatch(/cmd === 'pick' \|\| cmd === 'done'/);
});

// 2026-10-27: Bit looked for OPENAI_API_KEY; the site reads OPEN_API_KEY, so he reported a false break.
test('Bit checks the image key under the name the site reads', () => {
  expect(readFileSync('lib/ao/team/bit.js', 'utf8')).toMatch(/process\.env\.OPEN_API_KEY \|\| process\.env\.OPENAI_API_KEY/);
});

// 2026-10-28: Bart set a $30 daily line for the team's AI spend.
describe('AI spend', () => {
  const { costOf, spendCheck, weeklySpendLines } = require('../ao/team/spend.js');
  const { weeklyNoteDue } = require('../ao/team/bit.js');
  const row = (o) => ({ source: 'chat:jot', model: 'claude-opus-5-5', input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, thread_id: 't1', ...o });

  test('prices follow the published rates, with reused reading at the cheap rate', () => {
    expect(costOf(row({ input_tokens: 1e6 }))).toBeCloseTo(4);
    expect(costOf(row({ cache_read_tokens: 1e6 }))).toBeCloseTo(0.2);
    expect(costOf(row({ model: 'claude-sonnet-5-5', output_tokens: 1e6 }))).toBeCloseTo(10);
  });

  test('under the line and well reused is fine', () => {
    const c = spendCheck([row({ cache_read_tokens: 900000, input_tokens: 1000, output_tokens: 2000 })]);
    expect(c.status).toBe('ok');
    expect(c.detail).toMatch(/Jot/);
  });

  test('over $30, a runaway chat, or caching that stopped working is flagged', () => {
    const over = spendCheck([row({ input_tokens: 9e6 })]);
    expect(over.status).toBe('warn');
    expect(over.detail).toMatch(/over your \$30 daily line/);
    expect(over.detail).toMatch(/stuck in a loop/);
    expect(over.detail).toMatch(/reused at the cheaper rate/);
    expect(over.for_claude).toMatch(/SYSTEM_CACHE_SPLIT/);
  });

  test('the weekly note goes out on Mondays, once', () => {
    const monday = Date.parse('2026-11-02T15:00:00Z');
    expect(weeklyNoteDue(null, { now: monday })).toBe(true);
    expect(weeklyNoteDue('2026-11-02T09:00:00Z', { now: monday })).toBe(false);
    expect(weeklyNoteDue(null, { now: Date.parse('2026-11-03T15:00:00Z') })).toBe(false);
    expect(weeklySpendLines([row({ output_tokens: 1e6 })])[0]).toMatch(/about \$20\.00 this week/);
  });
});

// 2026-10-28: Bart: "If I set a limit, can you create a way for Bit to
// communicate the hard stop to me so I can temporarily suspend the limit?"
describe('the AI spending limit', () => {
  const { isLimitError, whatStopped, LIMITS_URL } = require('../ao/team/aiLimit.js');
  const { monthCheck } = require('../ao/team/spend.js');
  const { readFileSync } = require('node:fs');

  test('a refusal for the limit is told apart from other failures', () => {
    expect(isLimitError(new Error('400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."}}'))).toBe(true);
    expect(isLimitError(new Error('Your credit balance is too low to access the Anthropic API.'))).toBe(true);
    expect(isLimitError(new Error('529 Overloaded'))).toBe(false);
    expect(isLimitError(new Error('Request timed out'))).toBe(false);
    expect(whatStopped('chat:jot')).toBe("Jot's work");
    expect(whatStopped('text:classify')).toBe('a background check');
    expect(LIMITS_URL).toMatch(/^https:\/\/platform\.claude\.com\//);
  });

  test('every team call path reports a refusal, and the chat shows the pause', () => {
    expect(readFileSync('lib/ao/autoV2.js', 'utf8').match(/noteAiFailure\(err/g).length).toBeGreaterThanOrEqual(2);
    expect(readFileSync('lib/ao/textModel.js', 'utf8').match(/noteAiFailure\(err/g).length).toBe(2);
    expect(readFileSync('api/ao/auto/session.js', 'utf8')).toMatch(/ai_pause: aiPause/);
    expect(readFileSync('src/components/ao/AutoV2Panel.jsx', 'utf8')).toMatch(/The team is paused: the monthly AI spending limit was reached/);
  });

  test('Bit warns at 80% of the monthly limit', () => {
    const row = { source: 'chat:jot', model: 'claude-opus-5-5', input_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, output_tokens: 4e6, thread_id: null };
    expect(monthCheck([row], 100).status).toBe('warn');
    expect(monthCheck([row], 100).detail).toMatch(/80% of your \$100 monthly limit/);
    expect(monthCheck([row], 1000).status).toBe('ok');
    expect(monthCheck([row], NaN).detail).toMatch(/No monthly limit is on record/);
  });
});

// 2026-10-28: a commit that changes nothing the site runs does not start a build.
test('notes-only commits skip the site build', () => {
  const { readFileSync } = require('node:fs');
  expect(JSON.parse(readFileSync('vercel.json', 'utf8')).ignoreCommand).toBe('bash scripts/vercel-ignore-build.sh');
  const script = readFileSync('scripts/vercel-ignore-build.sh', 'utf8');
  for (const dir of ['notes', 'docs', 'lib/__tests__']) expect(script).toContain(`:(exclude)${dir}'`);
  expect(script).not.toMatch(/exclude\)(src|lib|api|public|dist|ao-knowledge-hq-kit)'/);
});
