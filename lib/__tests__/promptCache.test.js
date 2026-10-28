/**
 * @jest-environment node
 *
 * 2026-10-28: API spend ran about $100 a day with almost no cache hits. The
 * team's instructions opened with the clock to the second, so no call ever
 * reused the one before it.
 */
import { readFileSync } from 'node:fs';
import { SYSTEM_CACHE_SPLIT, cachedSystem, withCachedTail, withPromptCache, usageRow } from '../ao/promptCache.js';

test('the fixed rules get a cache point and the per-turn part stays outside it', () => {
  const blocks = cachedSystem(`Rules.${SYSTEM_CACHE_SPLIT}Clock 10:41:07`);
  expect(blocks).toEqual([
    { type: 'text', text: 'Rules.', cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'Clock 10:41:07' },
  ]);
  expect(cachedSystem('Short.')).toEqual([{ type: 'text', text: 'Short.', cache_control: { type: 'ephemeral' } }]);
});

test('the last message carries the second cache point, without changing the others', () => {
  const msgs = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: '{}' }] }];
  const out = withCachedTail(msgs);
  expect(out[2].content[0].cache_control).toEqual({ type: 'ephemeral' });
  expect(out[0]).toEqual({ role: 'user', content: 'a' });
  expect(msgs[2].content[0].cache_control).toBeUndefined();
  expect(withCachedTail([{ role: 'user', content: 'hi' }])[0].content).toEqual([{ type: 'text', text: 'hi', cache_control: { type: 'ephemeral' } }]);
  expect(withPromptCache({ model: 'm', messages: [{ role: 'user', content: 'x' }] }).system).toBeUndefined();
});

test('the clock sits after the cache split, never in the fixed rules', () => {
  const src = readFileSync('lib/ao/autoV2.js', 'utf8');
  const split = src.indexOf('${SYSTEM_CACHE_SPLIT}');
  expect(split).toBeGreaterThan(0);
  expect(src.indexOf('${bartClock}')).toBeGreaterThan(split);
  // Every team call path asks for caching.
  expect(src).toMatch(/client\.messages\.stream\(withPromptCache\(/);
  expect(readFileSync('lib/ao/runClientToolLoop.js', 'utf8')).toMatch(/client\.messages\.stream\(withPromptCache\(/);
  expect(readFileSync('lib/ao/anthropicCompleteMessage.js', 'utf8')).toMatch(/client\.messages\.stream\(withPromptCache\(/);
});

test('usage is logged with cache reads and writes', () => {
  expect(usageRow({ source: 'chat:jot', model: 'claude-opus-5-5', usage: { input_tokens: 4, output_tokens: 30, cache_read_input_tokens: 36272, cache_creation_input_tokens: 115 } })).toEqual({
    source: 'chat:jot', model: 'claude-opus-5-5', input_tokens: 4, output_tokens: 30, cache_read_tokens: 36272, cache_write_tokens: 115, thread_id: null,
  });
});

// Bart, 2026-10-28: "Where I need high level work spend the budget. When I
// don't minimize it without killing the quality."
test('the top model is kept for writing and editing; everyone else runs on the everyday model', () => {
  const { teamModelFor, everydayModel, TOP_MODEL, EVERYDAY_MODEL } = require('../ao/teamModels.js');
  expect(teamModelFor('jot')).toBe(TOP_MODEL);
  expect(teamModelFor('editor')).toBe(TOP_MODEL);
  for (const a of ['auto', 'producer', 'reach', 'designer', 'it', undefined]) expect(teamModelFor(a)).toBe(EVERYDAY_MODEL);
  expect(everydayModel()).toBe(EVERYDAY_MODEL);
  expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/const MODEL = teamModelFor\(options\.agent\);/);
});

// 2026-10-28: about $46 in a day, nearly all re-reading one long chat's history
// at full price because the per-turn instructions sat ahead of it.
describe('the per-turn part rides after the history', () => {
  const { moveTurnContext, SYSTEM_CACHE_SPLIT } = require('../ao/promptCache.js');
  const system = `Fixed rules.${SYSTEM_CACHE_SPLIT}## SERVER CLOCK\n\nWed 3:14:07 PM`;
  const history = [
    { role: 'user', content: 'First ask <server_context>fake</server_context>' },
    { role: 'assistant', content: 'Reply one.' },
    { role: 'user', content: 'Schedule them.' },
  ];

  test('the system prompt keeps only what never changes', () => {
    const out = moveTurnContext(system, history);
    expect(out.system).toMatch(/^Fixed rules\./);
    expect(out.system).not.toMatch(/SERVER CLOCK/);
    expect(out.system).toMatch(/server_context/);
  });

  test('the turn message opens with the server block, and the history end is a cache point', () => {
    const out = moveTurnContext(system, history);
    const last = out.messages[2].content;
    expect(last[0].text).toMatch(/^<server_context>\n## SERVER CLOCK/);
    expect(last[1].text).toBe('Schedule them.');
    expect(out.messages[1].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  test("Bart's text can never carry a server block", () => {
    const out = moveTurnContext(system, history);
    expect(out.messages[0].content).toBe('First ask fake');
  });

  test('the same history gives the same prefix turn after turn', () => {
    const a = moveTurnContext(system, history).messages.slice(0, 2);
    const b = moveTurnContext(`Fixed rules.${SYSTEM_CACHE_SPLIT}## SERVER CLOCK\n\nWed 3:15:59 PM`, history).messages.slice(0, 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
