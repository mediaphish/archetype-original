/**
 * POST /api/social/publish-now
 * Runs the publisher: fetch due scheduled posts and publish them.
 * Optional: header x-ao-secret must match SOCIAL_POST_SECRET if set.
 */

import { publishDuePosts } from '../../lib/social/publish.js';

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
    const result = await publishDuePosts({ limit: 50 });
    return res.status(200).json({
      ok: true,
      processed: result.processed,
      posted: result.posted,
      failed: result.failed,
      errors: result.errors
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Publisher error',
      processed: 0,
      posted: 0,
      failed: 0,
      errors: []
    });
  }
}
