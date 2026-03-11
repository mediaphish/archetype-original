/**
 * AO Automation — X posting test.
 * POST /api/providers/x/test-post
 *
 * Owner-only; posts a real test post.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { postToTwitter } from '../../../lib/social/twitter.js';

function nowStamp() {
  const d = new Date();
  return d.toLocaleString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const result = await postToTwitter({ text: `AO Automation test post (X) — ${nowStamp()}` }, 'personal');
    if (result.success) return res.status(200).json({ ok: true, postId: result.postId });
    return res.status(200).json({ ok: false, error: result.error || 'X test post failed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'X test post failed' });
  }
}

