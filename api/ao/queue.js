/**
 * GET /api/ao/queue
 *
 * Everything waiting on Bart, for #queue in chat: one count, the questions the
 * team put to him, and the journal posts whose next step is his OK. The other
 * items (emails, resurfaces, infographics, quote cards) are listed by their own
 * endpoints, which also hold their Approve buttons. See lib/ao/queueFeed.js.
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { loadQueue } from '../../lib/ao/queueFeed.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    return res.status(200).json(await loadQueue(auth.email));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
