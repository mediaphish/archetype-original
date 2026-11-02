/**
 * The LinkedIn company page connection, for Auto's Settings page. No tokens leave the server.
 *   GET  /api/ao/linkedin/page-status   where the connection stands
 *   POST /api/ao/linkedin/page-status   proves it can post: creates a hidden draft
 *        with an image as the page, then deletes it, so nothing appears publicly.
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { deleteLinkedInPost, loadPageConnection, pageAppMissing, pageRedirectUri } from '../../../lib/social/linkedinPage.js';
import { postToLinkedIn } from '../../../lib/social/linkedin.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  const connection = await loadPageConnection();

  if (req.method === 'GET') {
    const expired = connection?.expires_at && Date.parse(connection.expires_at) < Date.now();
    return res.status(200).json({
      ok: true,
      app_ready: pageAppMissing().length === 0,
      redirect_uri: pageRedirectUri(),
      connected: Boolean(connection) && !expired,
      state: !connection ? 'not_connected' : expired ? 'needs_reconnect' : 'connected',
      expires_at: connection?.expires_at || null,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!connection) return res.status(409).json({ ok: false, error: 'The company page is not connected yet.' });

  const out = await postToLinkedIn(
    { text: 'Connection check. This draft is deleted immediately.', imageUrl: `${SITE_URL}/og-default.jpg`, lifecycleState: 'DRAFT' },
    'page_1'
  );
  if (!out.success) return res.status(200).json({ ok: false, error: out.error });
  const removed = await deleteLinkedInPost(connection.access_token, out.postId);
  return res.status(200).json({ ok: true, draft_removed: removed, post_id: removed ? null : out.postId });
}
