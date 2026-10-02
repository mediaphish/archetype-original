/**
 * AO Automation — begin connecting the personal Instagram account.
 * GET /api/ao/instagram-login/start
 *
 * Sends Bart to Instagram to approve the connection. Instagram returns him to
 * the callback with a code. Owner session required, since the account this
 * connects is his.
 *
 * 2026-10-02. Until today there was no way to connect or reconnect this account
 * from the site at all: the token was created by hand in July, the weekly
 * refresh job that was meant to keep it alive had been failing since August, and
 * when it expired on September 24 the channel simply stopped with no way back.
 */

import crypto from 'node:crypto';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { buildAuthorizeUrl, instagramAppCredentials, instagramRedirectUri } from '../../../lib/social/instagramLoginOAuth.js';

/** Ten minutes is long enough to approve and short enough to be worth little if leaked. */
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * The state parameter proves the callback is answering this request rather than
 * one someone else started. It is signed with a secret the server already has,
 * so nothing extra has to be stored between the two requests.
 */
export function signState(nonce, expiresAt, secret) {
  return crypto.createHmac('sha256', secret).update(`${nonce}.${expiresAt}`).digest('hex');
}

export function buildState(secret, now = Date.now()) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = now + STATE_TTL_MS;
  return `${nonce}.${expiresAt}.${signState(nonce, expiresAt, secret)}`;
}

export function verifyState(state, secret, now = Date.now()) {
  const parts = String(state || '').split('.');
  if (parts.length !== 3) return false;
  const [nonce, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = signState(nonce, expiresAtRaw, secret);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function stateSecret() {
  return String(
    process.env.AO_SESSION_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const { configured } = instagramAppCredentials();
  if (!configured) {
    return res.status(500).json({
      ok: false,
      error:
        'Instagram is not set up for sign in yet. INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET need to be added, and ' +
        `${instagramRedirectUri()} has to be registered on the Instagram app as a redirect URI.`,
    });
  }

  const secret = stateSecret();
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'No server secret available to secure the sign in.' });
  }

  res.writeHead(302, { Location: buildAuthorizeUrl(buildState(secret)) });
  return res.end();
}
