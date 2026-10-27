/**
 * @jest-environment node
 *
 * Bart, 2026-10-27: "Why cut off? I didn't ask for this." Nothing on his screen
 * cuts a message off. The team read short copies (the huddle only 1,500
 * characters a message) and reported whole captions as cut off. Now the team
 * reads far more, and any shortened copy says it is not a cut-off.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { shortenedCopy, SHORTENED_MARK } from '../ao/shortenedCopy.js';
import { huddleTranscript } from '../ao/team/huddle.js';

test('short text is left alone, long text is marked as shortened, not cut off', () => {
  expect(shortenedCopy('hello', 10)).toBe('hello');
  const s = shortenedCopy('x'.repeat(50), 10);
  expect(s.startsWith('x'.repeat(10))).toBe(true);
  expect(s).toContain(SHORTENED_MARK);
  expect(SHORTENED_MARK).toMatch(/never tell Bart or the team that it was cut off/);
});

test('the huddle reads a whole caption set, not the first 1,500 characters', () => {
  const captions = 'c'.repeat(6000);
  const t = huddleTranscript([{ role: 'assistant', content: captions, meta: { agent: 'jot' } }]);
  expect(t).toBe(`Jot: ${captions}`);
});

test('wired: history, speak-up and the team rules use it', () => {
  expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/content: shortenedCopy\(content, MAX_HISTORY_MESSAGE_CHARS\)/);
  expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/MAX_HISTORY_MESSAGE_CHARS = 40000/);
  expect(readFileSync('lib/ao/team/speakUp.js', 'utf8')).toMatch(/shortenedCopy\(reply, 20000\)/);
  expect(readFileSync('lib/ao/team/agents.js', 'utf8')).toMatch(/Nothing on Bart\\'s screen cuts a message off/);
});
