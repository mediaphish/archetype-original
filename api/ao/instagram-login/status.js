/**
 * AO Automation — Instagram Login (personal / mediaphish) connection status.
 * GET /api/ao/instagram-login/status
 *
 * Reads ao_instagram_login_tokens via getInstagramLoginConnection('ig_mediaphish').
 * Does not post anything. Returns connected: false (not an error) if the row is missing.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getInstagramLoginConnection } from '../../../lib/social/instagramLoginConnection.js';
import {
  formatInstagramLoginStatus,
  IG_PERSONAL_ACCOUNT_ID,
} from '../../../lib/ao/instagramLoginStatus.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const conn = await getInstagramLoginConnection(IG_PERSONAL_ACCOUNT_ID);
    const status = formatInstagramLoginStatus(conn);
    return res.status(200).json({
      ok: true,
      account_id: IG_PERSONAL_ACCOUNT_ID,
      ...status,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Instagram Login status check failed' });
  }
}
