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
