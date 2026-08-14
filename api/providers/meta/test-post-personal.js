/**
 * AO Automation — Instagram Personal (mediaphish) test post.
 * POST /api/providers/meta/test-post-personal
 *
 * Always posts via postToInstagram(..., 'ig_mediaphish') — Instagram Login path,
 * not the Page-linked Meta Business account.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { postToInstagram } from '../../../lib/social/instagram.js';
import { IG_PERSONAL_ACCOUNT_ID } from '../../../lib/ao/instagramLoginStatus.js';

const DEFAULT_TEST_IMAGE = 'https://www.archetypeoriginal.com/images/leading-well-under-bad-leadership.jpg';

function nowStamp() {
  return new Date().toLocaleString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role === 'reviewer') {
    const { logReviewerEvent } = await import('../../../lib/ao/reviewerAuditLog.js');
    await logReviewerEvent({
      eventType: 'production_action_triggered',
      route: '/api/providers/meta/test-post-personal',
      method: req.method,
      requestSummary: { account_id: IG_PERSONAL_ACCOUNT_ID },
      resultOk: null,
      req,
    });
  }

  try {
    const result = await postToInstagram(
      {
        text: `AO Automation test post (Instagram Personal @mediaphish) — ${nowStamp()}`,
        imageUrl: DEFAULT_TEST_IMAGE,
      },
      IG_PERSONAL_ACCOUNT_ID
    );
    if (result.success) {
      return res.status(200).json({
        ok: true,
        postId: result.postId,
        account_id: IG_PERSONAL_ACCOUNT_ID,
      });
    }
    return res.status(200).json({
      ok: false,
      error: result.error || 'Instagram Personal test post failed',
      account_id: IG_PERSONAL_ACCOUNT_ID,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Test post failed' });
  }
}
