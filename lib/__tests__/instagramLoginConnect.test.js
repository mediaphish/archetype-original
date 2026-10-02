/**
 * @jest-environment node
 *
 * The channel with no way back (2026-10-02).
 *
 * The personal Instagram token was created by hand on July 26 and expired on
 * September 24. The site had only a read-only status check, because the design
 * assumed a weekly refresh job would keep it alive forever. That job had failed
 * every Monday since at least August 10 without telling anyone, and once a token
 * is past its expiry, refreshing cannot bring it back. The channel was simply
 * dead with nothing on the site able to revive it.
 *
 * Bart: "Get my personal instagram connected again."
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { signState, buildState, verifyState } from '../../api/ao/instagram-login/start.js';
import { INSTAGRAM_LOGIN_SCOPES, buildAuthorizeUrl } from '../../lib/social/instagramLoginOAuth.js';

const root = process.cwd();
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const SECRET = 'a-test-secret-for-state-signing';

describe('there is a way to connect the account from the site', () => {
  test('both halves of the sign in exist', () => {
    expect(existsSync(join(root, 'api/ao/instagram-login/start.js'))).toBe(true);
    expect(existsSync(join(root, 'api/ao/instagram-login/callback.js'))).toBe(true);
  });

  test('both are routed, since an unrouted endpoint is a 404 on this project', () => {
    const paths = (vercel.routes || []).map((r) => r.src);
    expect(paths).toContain('/api/ao/instagram-login/start');
    expect(paths).toContain('/api/ao/instagram-login/callback');
  });

  test('it asks for publishing, not just reading', () => {
    // Asking for less would reconnect cleanly and then fail at publish time,
    // which is the exact failure this was built to end.
    expect(INSTAGRAM_LOGIN_SCOPES).toContain('instagram_business_content_publish');
    expect(INSTAGRAM_LOGIN_SCOPES).toContain('instagram_business_basic');
  });

  test('the Settings card offers connecting rather than only reporting', () => {
    const settings = readFileSync(join(root, 'src/pages/ao/Settings.jsx'), 'utf8');
    expect(settings).toContain('/api/ao/instagram-login/start');
    expect(settings).toMatch(/Reconnect Instagram|Connect Instagram/);
    // The old card told him reconnecting happened "offline", which is no longer true.
    expect(settings).not.toContain('reconnect is handled offline');
  });

  test('Instagram Business is named somewhere he can find it', () => {
    const settings = readFileSync(join(root, 'src/pages/ao/Settings.jsx'), 'utf8');
    expect(settings).toContain('Instagram Business');
  });
});

describe('the callback only accepts a sign in this site started', () => {
  test('a state it signed round-trips', () => {
    expect(verifyState(buildState(SECRET), SECRET)).toBe(true);
  });

  test('a state signed with another secret is refused', () => {
    expect(verifyState(buildState('someone-elses-secret'), SECRET)).toBe(false);
  });

  test('a tampered state is refused', () => {
    const [nonce, expiresAt, sig] = buildState(SECRET).split('.');
    expect(verifyState(`${nonce}x.${expiresAt}.${sig}`, SECRET)).toBe(false);
    expect(verifyState(`${nonce}.${Number(expiresAt) + 60000}.${sig}`, SECRET)).toBe(false);
  });

  test('an expired state is refused', () => {
    const nonce = 'abc123';
    const expiresAt = String(Date.now() - 1000);
    const stale = `${nonce}.${expiresAt}.${signState(nonce, expiresAt, SECRET)}`;
    expect(verifyState(stale, SECRET)).toBe(false);
  });

  test('junk is refused rather than throwing', () => {
    for (const bad of ['', null, undefined, 'x', 'a.b', 'a.b.c.d']) {
      expect(verifyState(bad, SECRET)).toBe(false);
    }
  });
});

describe('the authorize link', () => {
  test('carries the scopes and the state', () => {
    process.env.INSTAGRAM_APP_ID = '1234567890';
    const url = new URL(buildAuthorizeUrl('state-value'));
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe(INSTAGRAM_LOGIN_SCOPES.join(','));
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});
