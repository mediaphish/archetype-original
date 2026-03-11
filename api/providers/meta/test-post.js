/**
 * AO Automation — Meta posting test (Facebook Page / Instagram feed).
 * POST /api/providers/meta/test-post
 * Body: { platform: "facebook" | "instagram" }
 *
 * Owner-only; posts a real test post.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { postToFacebook } from '../../../lib/social/facebook.js';
import { postToInstagram } from '../../../lib/social/instagram.js';

const DEFAULT_TEST_IMAGE = 'https://www.archetypeoriginal.com/images/leading-well-under-bad-leadership.jpg';

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

  const platform = String(req.body?.platform || '').toLowerCase().trim();
  if (platform !== 'facebook' && platform !== 'instagram') {
    return res.status(400).json({ ok: false, error: 'platform must be facebook or instagram' });
  }

  try {
    if (platform === 'facebook') {
      const result = await postToFacebook(
        { text: `AO Automation test post (Facebook) — ${nowStamp()}`, imageUrl: DEFAULT_TEST_IMAGE },
        'meta'
      );
      if (result.success) return res.status(200).json({ ok: true, postId: result.postId });
      return res.status(200).json({ ok: false, error: result.error || 'Facebook test post failed' });
    }

    const result = await postToInstagram(
      { text: `AO Automation test post (Instagram) — ${nowStamp()}`, imageUrl: DEFAULT_TEST_IMAGE },
      'meta'
    );
    if (result.success) return res.status(200).json({ ok: true, postId: result.postId });
    return res.status(200).json({ ok: false, error: result.error || 'Instagram test post failed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Test post failed' });
  }
}

