/**
 * @jest-environment node
 *
 * The team huddle (Bart, 2026-10-26: "Would like to see them interacting with
 * each other more." "Build it."). Ada runs it; every turn does real work; it is
 * capped; it ends with Ada closing with Bart.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { pickNextTurn, huddleTurnMessage, huddleTranscript, moderatorPrompt, MAX_TURNS, CLOSE_MESSAGE } from '../ao/team/huddle.js';

test('Ada picks a real next turn: a teammate, someone to talk to, and a reason', () => {
  expect(pickNextTurn({ next: 'editor', to: 'jot', note: 'the opening runs long' }, { turns: 1, last: 'jot' })).toEqual({ done: false, agent: 'editor', to: 'jot', note: 'the opening runs long' });
});
test('the huddle stops when settled, at the cap, or if the same teammate would go twice', () => {
  expect(pickNextTurn({ next: 'done', note: 'settled' }, { turns: 2 })).toMatchObject({ done: true });
  expect(pickNextTurn({ next: 'jot', to: 'auto', note: 'x' }, { turns: MAX_TURNS })).toMatchObject({ done: true });
  expect(pickNextTurn({ next: 'jot', to: 'auto', note: 'x' }, { turns: 1, last: 'jot' })).toMatchObject({ done: true });
  expect(pickNextTurn({ next: 'nobody', note: 'x' }, { turns: 1 })).toMatchObject({ done: true });
  expect(pickNextTurn({ next: 'jot', to: 'auto', note: '' }, { turns: 1 })).toMatchObject({ done: true });
  expect(pickNextTurn(null, { turns: 0 })).toMatchObject({ done: true });
});
test('nobody talks to themselves', () => {
  expect(pickNextTurn({ next: 'reach', to: 'reach', note: 'x' }, { turns: 1, last: 'editor' })).toMatchObject({ agent: 'reach', to: 'editor' });
});
test('a turn speaks to a teammate by name, does work, and leaves Bart to Ada', () => {
  const m = huddleTurnMessage({ agent: 'editor', to: 'jot', note: 'the opening runs long' });
  expect(m).toMatch(/^\[TEAM\] Huddle\. Red, your turn: the opening runs long\. Speak to Jot directly, by name/);
  expect(m).toMatch(/Do not agree just to agree, do not thank or praise/);
  expect(m).toMatch(/do not address Bart; Ada closes with him/);
  expect(CLOSE_MESSAGE).toMatch(/at most one question that is truly his/);
});
test('Ada reads the conversation, not the team\u2019s stage notes', () => {
  const t = huddleTranscript([
    { role: 'user', content: 'How is Entry 2?' },
    { role: 'assistant', content: 'It is ready.', meta: { agent: 'jot' } },
    { role: 'user', content: '[TEAM] Huddle. Red, your turn', meta: { team_note: true } },
    { role: 'assistant', content: 'Jot, the opening runs long.', meta: { agent: 'editor' } },
  ]);
  expect(t).toBe('Bart: How is Entry 2?\n\nJot: It is ready.\n\nRed: Jot, the opening runs long.');
  expect(moderatorPrompt({ transcript: t, turns: 1, last: 'editor' })).toMatch(/Agreeing, thanking, praising, repeating and summarizing are not turns/);
});
test('wired: the speak-up check starts a huddle, the team runner runs it, the chat shows it', () => {
  expect(readFileSync('api/ao/team/speak-up.js', 'utf8')).toMatch(/startHuddle\(\{ owner: auth\.email, threadId, opener:/);
  expect(readFileSync('api/ao/team/run.js', 'utf8')).toMatch(/runHuddleStep\(huddleThread\)/);
  expect(readFileSync('api/ao/team/run.js', 'utf8')).toMatch(/huddles: await sweepHuddles\(\)/);
  expect(readFileSync('src/components/ao/AutoV2Panel.jsx', 'utf8')).toMatch(/if \(up\?\.huddle\)/);
});
