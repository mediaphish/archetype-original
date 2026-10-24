/**
 * Vercel cron (Mondays, 7 AM Central): the one-page summary of Bart's clients.
 * See lib/calendly/weeklySummary.js. Secured by CRON_SECRET if set.
 */

import { sendWeeklySummary } from '../../lib/calendly/weeklySummary.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = String(auth).replace(/^Bearer\s+/i, '');
    if (provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const result = await sendWeeklySummary();
    console.log('[clients-weekly]', JSON.stringify(result));
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('[clients-weekly] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
