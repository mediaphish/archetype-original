/**
 * POST /api/ao/auth/reviewer-login
 *
 * Scoped login for external reviewers (e.g. LinkedIn API review). Password-based,
 * not Magic Link, because there is no reviewer inbox to send a link to.
 *
 * Requires REVIEWER_PASSWORD to be set in Vercel env vars.
 * Bart sets this manually and shares only the password with the reviewer,
 * never anything tied to his own owner credentials.
 */

import { setAoSessionCookie } from '../../../lib/ao/requireAoSession.js';
import { logReviewerEvent } from '../../../lib/ao/reviewerAuditLog.js';

const REVIEWER_IDENTITY = 'reviewer@internal';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const reviewerPassword = process.env.REVIEWER_PASSWORD || '';

  if (!reviewerPassword) {
    return res.status(503).json({ ok: false, error: 'Reviewer access is not configured.' });
  }

  const { password } = req.body || {};

  if (String(password || '') !== reviewerPassword) {
    await logReviewerEvent({
      eventType: 'login_failed',
      route: '/api/ao/auth/reviewer-login',
      method: 'POST',
      resultOk: false,
      req,
    });
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }

  const cookieOk = setAoSessionCookie(res, REVIEWER_IDENTITY, 'reviewer');
  if (!cookieOk) {
    return res.status(503).json({ ok: false, error: 'Session signing is not configured.' });
  }

  await logReviewerEvent({
    eventType: 'login_success',
    route: '/api/ao/auth/reviewer-login',
    method: 'POST',
    resultOk: true,
    req,
  });

  return res.status(200).json({ ok: true });
}
