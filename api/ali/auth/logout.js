/**
 * ALI Logout — clears the session cookie.
 * POST /api/ali/auth/logout
 */

import { clearSessionCookieHeader } from '../../../lib/ali-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  return res.status(200).json({ ok: true });
}
