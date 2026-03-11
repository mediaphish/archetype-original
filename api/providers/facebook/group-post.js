/**
 * AO Automation — Best-effort Facebook Group post.
 * POST /api/providers/facebook/group-post
 *
 * Uses configured facebook group credentials (account_id: group_1).
 * If Meta blocks group posting, the endpoint returns the error and the UI still
 * provides copy/paste-ready Group text.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { postToFacebook } from '../../../lib/social/facebook.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'text required' });

  try {
    const result = await postToFacebook({ text }, 'group_1');
    if (result.success) {
      return res.status(200).json({ ok: true, postId: result.postId });
    }
    return res.status(200).json({ ok: false, error: result.error || 'Group post failed' });
  } catch (e) {
    console.error('[providers/facebook/group-post]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Group post failed' });
  }
}

