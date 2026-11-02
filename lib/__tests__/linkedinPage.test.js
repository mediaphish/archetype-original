/**
 * @jest-environment node
 *
 * LinkedIn approved Community Management on a separate app (2026-11-02). The
 * company page connects on its own and must never disturb the personal one.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { choosePageUrn, pageAppMissing } from '../social/linkedinPage.js';
import { newPageState, pageStateMatches } from '../social/linkedinPageState.js';

const A = 'urn:li:organization:1';
const B = 'urn:li:organization:2';
const read = (p) => readFileSync(join(process.cwd(), p), 'utf8');

test('the page is never a guess', () => {
  expect(choosePageUrn([A])).toEqual({ urn: A });
  expect(choosePageUrn([A, A])).toEqual({ urn: A });
  expect(choosePageUrn([A, B]).error).toMatch(/2 company pages/);
  expect(choosePageUrn([]).error).toMatch(/does not administer/);
  expect(choosePageUrn([A, B], B)).toEqual({ urn: B });
  expect(choosePageUrn([A], B).error).toMatch(/does not administer/);
});

test('it says what the site is missing', () => {
  expect(pageAppMissing({})).toEqual(['LINKEDIN_PAGE_CLIENT_ID', 'LINKEDIN_PAGE_CLIENT_SECRET']);
  expect(pageAppMissing({ LINKEDIN_PAGE_CLIENT_ID: 'a', LINKEDIN_PAGE_CLIENT_SECRET: 'b' })).toEqual([]);
});

test('a forged return from sign-in is refused', () => {
  process.env.AO_OAUTH_COOKIE_SECRET = 'test-secret';
  const { state, cookie } = newPageState();
  expect(pageStateMatches(state, cookie)).toBe(true);
  expect(pageStateMatches('other', cookie)).toBe(false);
  expect(pageStateMatches(state, `${state}.forged`)).toBe(false);
  expect(pageStateMatches(state, null)).toBe(false);
});

test('the page connection never touches the personal one and asks for no member identity', () => {
  const code = ['lib/social/linkedinPage.js', 'api/auth/linkedin/page-start.js', 'api/auth/linkedin/page-callback.js', 'api/ao/linkedin/page-status.js'].map(read).join('\n');
  expect(code).not.toMatch(/ao_linkedin_tokens'\)/);
  expect(code).not.toMatch(/userinfo|openid|r_basicprofile/);
});

test('deleting LinkedIn data covers the page connection', () => {
  expect(read('lib/social/linkedinDataDeletion.js')).toMatch(/ao_linkedin_page_tokens/);
});
