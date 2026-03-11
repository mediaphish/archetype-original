/**
 * AO Automation Dashboard — Sign out (clear AO session cookie).
 * POST /api/ao/auth/logout
 */

import { clearAoSessionCookie } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  clearAoSessionCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}

