/**
 * Vercel cron: publish approved journal drafts whose scheduled_publish_at is due.
 * Schedule: every 15 minutes. Secured by CRON_SECRET if set.
 */

import { publishDueScheduledJournals } from '../../lib/ao/publishDueScheduledJournals.js';

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
    const result = await publishDueScheduledJournals({ limit: 20 });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Scheduled journal publisher error',
      processed: 0,
      published: 0,
      skipped: 0,
      results: [],
    });
  }
}
