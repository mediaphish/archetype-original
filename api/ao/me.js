/**
 * AO Automation — Session check for the owner console.
 * GET /api/ao/me
 * Returns { ok: true, email } when signed in.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  return res.status(200).json({ ok: true, email: auth.email });
}

