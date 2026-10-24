/**
 * Vercel cron (every 15 minutes): research for new bookings, and the after-call
 * thank-you for Bart to review. See lib/calendly/followups.js.
 * Secured by CRON_SECRET if set.
 */

import { runFollowups } from '../../lib/calendly/followups.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = String(auth).replace(/^Bearer\s+/i, '');
    if (provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const result = await runFollowups();
    if (result.done.length) console.log('[calendly-followups]', JSON.stringify(result));
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('[calendly-followups] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
