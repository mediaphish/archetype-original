/**
 * POST /api/ao/auth/reviewer-login
 *
 * Scoped login for external reviewers (e.g. LinkedIn API review). Password-based,
 * not Magic Link, because there is no reviewer inbox to send a link to.
 *
 * Requires REVIEWER_EMAIL and REVIEWER_PASSWORD to be set in Vercel env vars.
 * Bart sets these manually and shares only the password with the reviewer,
 * never anything tied to his own owner credentials.
 */

import { setAoSessionCookie } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const reviewerEmail = (process.env.REVIEWER_EMAIL || '').toLowerCase().trim();
  const reviewerPassword = process.env.REVIEWER_PASSWORD || '';

  if (!reviewerEmail || !reviewerPassword) {
    return res.status(503).json({ ok: false, error: 'Reviewer access is not configured.' });
  }

  const { password } = req.body || {};

  if (String(password || '') !== reviewerPassword) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }

  const cookieOk = setAoSessionCookie(res, reviewerEmail, 'reviewer');
  if (!cookieOk) {
    return res.status(503).json({ ok: false, error: 'Session signing is not configured.' });
  }

  return res.status(200).json({ ok: true });
}
