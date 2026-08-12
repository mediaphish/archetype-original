/**
 * POST /api/social/post-now
 * Body: { platform, account_id, text, image_url? }
 * Inserts a post with scheduled_at = now and runs the publisher once for it.
 * Optional: header x-ao-secret must match SOCIAL_POST_SECRET if set.
 */

import { validatePlatformAccount } from '../../lib/social/config.js';
import { publishPostById } from '../../lib/social/publish.js';
import { insertScheduledPostsSafely } from '../../lib/db/scheduledPosts.js';

function requireSecret(req) {
  const secret = process.env.SOCIAL_POST_SECRET;
  if (!secret) return true;
  const provided = req.headers['x-ao-secret'] || req.body?.secret;
  return provided === secret;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!requireSecret(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { platform, account_id, text, image_url, first_comment } = req.body || {};
    const validation = validatePlatformAccount(platform, account_id);
    if (!validation.valid) {
      return res.status(400).json({ ok: false, error: validation.error });
    }
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'text is required' });
    }

    const now = new Date().toISOString();
    const trimmed = text.trim();
    const result = await insertScheduledPostsSafely(
      [
        {
          platform,
          account_id,
          scheduled_at: now,
          text: trimmed,
          caption: trimmed,
          image_url: image_url && typeof image_url === 'string' ? image_url.trim() || null : null,
          first_comment:
            first_comment && typeof first_comment === 'string' ? first_comment.trim() || null : null,
          status: 'scheduled',
        },
      ],
      { select: 'id' }
    );

    if (!result.ok || !result.inserted?.[0]?.id) {
      return res.status(result.rejected?.length ? 400 : 500).json({
        ok: false,
        error: result.error || 'Insert failed',
        rejected: result.rejected || [],
      });
    }

    const id = result.inserted[0].id;
    const pub = await publishPostById(id);
    if (!pub.ok) {
      return res.status(500).json({ ok: false, error: pub.error, id });
    }
    return res.status(200).json({ ok: true, id, externalId: pub.externalId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
