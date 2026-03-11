/**
 * AO Automation — X connection status.
 * GET /api/ao/x/status
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getXAccessToken } from '../../../lib/social/xConnection.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const token = await getXAccessToken();
  if (!token.ok) {
    return res.status(200).json({ ok: true, connected: false, reason: token.error || 'Not connected' });
  }

  return res.status(200).json({
    ok: true,
    connected: true,
    username: token.username || null,
    source: token.source || 'stored',
  });
}

