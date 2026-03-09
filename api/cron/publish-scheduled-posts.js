/**
 * Vercel cron: run the publisher for due scheduled posts.
 * Schedule: e.g. every 15 minutes. Secured by CRON_SECRET if set.
 */

import { publishDuePosts } from '../../lib/social/publish.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
    if (provided !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
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
