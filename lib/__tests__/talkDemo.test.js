/**
 * @jest-environment node
 */
// 2026-10-28: "Live from the room" in the chamber talk.
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
const { cleanCaptions, jsonFrom, postDemo } = require('../ao/talkDemo.js');

const caps = { linkedin_personal: 'a — b', instagram_business: 'b', instagram_personal: 'c', facebook_business: 'd', twitter: 'x'.repeat(300) };

test('captions are safe to post: every channel, X within 280, no em dashes', () => {
  const c = cleanCaptions(caps);
  expect(c.linkedin_personal).toBe('a, b');
  expect(c.twitter.length).toBeLessThanOrEqual(280);
  expect(cleanCaptions({ ...caps, facebook_business: '' })).toBeNull();
  expect(jsonFrom('```json\n{"a":1}\n```')).toEqual({ a: 1 });
});

test('a rehearsal never posts', async () => {
  const out = await postDemo({ package: { captions: caps, photo_url: 'https://x/photo.jpg' } });
  expect(out.rehearsal).toBe(true);
});

describe('section 6 mistakes (2026-11-08)', () => {
  test('Jot, Des and Bit each get only their approved facts and are told to own it', () => {
    const { MISTAKE_ORDER, MISTAKE_FACTS, talkSystem } = require('../ao/talkAsk.js');
    expect(MISTAKE_ORDER).toEqual(['jot', 'designer', 'it']);
    for (const a of MISTAKE_ORDER) expect(MISTAKE_FACTS[a]).toMatch(/What changed/);
    const s = talkSystem('jot', { facts: MISTAKE_FACTS.jot, topic: 'mistake' });
    expect(s).toContain('Own your mistake plainly');
    expect(s).toContain('October 28');
    expect(s).not.toMatch(/—/);
  });
});

describe('stage Q&A (2026-11-08)', () => {
  test('a reply can hand the question to the teammate it belongs to', () => {
    const { readHandoff } = require('../ao/talkAsk.js');
    expect(readHandoff("That's Bit's world, dude. Bit, take it.\nHANDOFF: Bit", 'producer')).toEqual({ reply: "That's Bit's world, dude. Bit, take it.", handoff: 'it' });
    expect(readHandoff('It took about two minutes.', 'producer')).toEqual({ reply: 'It took about two minutes.', handoff: null });
    expect(readHandoff('Mine.\nHANDOFF: Cam', 'producer').handoff).toBeNull();
  });
  test('spending and task times read true from the log', () => {
    const { spendFacts, taskFacts } = require('../ao/talkBriefing.js');
    const day = Date.parse('2026-11-11T06:00:00Z');
    const rows = [
      { source: 'talk:ask-it', model: 'claude-haiku-4-5', input_tokens: 1000000, output_tokens: 0, at: '2026-11-11T17:00:00Z' },
      { source: 'text:analysis', model: 'claude-haiku-4-5', input_tokens: 2000000, output_tokens: 0, at: '2026-11-11T12:00:00Z' },
    ];
    const lines = spendFacts(rows, { dayStart: day, monthStart: day });
    expect(lines[0]).toContain('$1.00');
    expect(lines[1]).toContain('$3.00');
    expect(taskFacts([{ created_at: '2026-11-10T10:00:00Z', finished_at: '2026-11-10T10:12:00Z' }])[0]).toContain('12 minutes');
  });
});
