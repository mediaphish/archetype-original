/**
 * Vercel cron (weekdays): keep up to two infographics waiting for Bart's
 * review in the Queue. Makes at most one per run. Nothing posts from here.
 * See lib/ao/infographics.js. Secured by CRON_SECRET if set.
 */

import { keepInfographicsWaiting } from '../../../lib/ao/infographics.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = String(auth).replace(/^Bearer\s+/i, '');
    if (provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const result = await keepInfographicsWaiting();
    console.log('[cron infographics]', JSON.stringify({ ok: result.ok, skipped: result.skipped, waiting: result.waiting, error: result.error }));
    return res.status(result.ok ? 200 : 502).json({ ok: result.ok, waiting: result.waiting, error: result.error || null });
  } catch (err) {
    console.error('[cron infographics] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
