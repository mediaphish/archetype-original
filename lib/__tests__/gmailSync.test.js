/**
 * @jest-environment node
 *
 * Client email on the timeline (2026-10-24): only mail to or from a client,
 * only from Bart's own verified Google identity.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { classify, cleanBody, verifiedGoogleEmail, isOwner } from '../calendly/gmailSync.js';

const clients = ['jordan@acme.com'];

test('a client writing in is a reply; Bart writing out is his email; anything else is ignored', () => {
  expect(classify({ from: 'Jordan@Acme.com', to: ['bart@archetypeoriginal.com'] }, clients)).toEqual({ email: 'jordan@acme.com', kind: 'reply' });
  expect(classify({ from: 'bart@archetypeoriginal.com', to: ['someone@else.com', 'jordan@acme.com'] }, clients)).toEqual({ email: 'jordan@acme.com', kind: 'email_out' });
  expect(classify({ from: 'newsletter@shop.com', to: ['bart@archetypeoriginal.com'] }, clients)).toBeNull();
  expect(classify({ from: 'bart@archetypeoriginal.com', to: ['friend@home.com'] }, clients)).toBeNull();
});

test('the quoted earlier message is dropped from a reply', () => {
  expect(cleanBody('Thanks, that helped.\n\nOn Mon, Oct 26, 2026 at 9:00 AM Bart Paden <bart@archetypeoriginal.com> wrote:\n> Hi Jordan')).toBe('Thanks, that helped.');
});

test('only a verified, unexpired Google token for Bart gets in', async () => {
  const ok = { ok: true, json: async () => ({ email: 'bart@archetypeoriginal.com', email_verified: 'true', exp: String(Date.now() / 1000 + 600) }) };
  expect(await verifiedGoogleEmail('t', { fetchImpl: async () => ok })).toBe('bart@archetypeoriginal.com');
  const stale = { ok: true, json: async () => ({ email: 'bart@archetypeoriginal.com', email_verified: true, exp: '1' }) };
  expect(await verifiedGoogleEmail('t', { fetchImpl: async () => stale })).toBeNull();
  expect(await verifiedGoogleEmail('', { fetchImpl: async () => ok })).toBeNull();
  expect(isOwner('someone@else.com')).toBe(false);
});
