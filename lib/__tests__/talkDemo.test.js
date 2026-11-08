/**
 * @jest-environment node
 */
// 2026-10-28: "Live from the room" in the Neosho talk.
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
