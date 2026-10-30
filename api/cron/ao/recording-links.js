/**
 * Vercel cron (daily, 9am Central): email the Riverside studio link to every
 * guest whose recording is five days out or closer and has not had it yet,
 * then email Bart whatever a recording needs from him today (the day before,
 * the morning after, a nudge for missing notes). See
 * lib/ao/podcastRecordingLinks.js. Secured by CRON_SECRET if set.
 */

import { sendDueRecordingLinks, sendBartRecordingNotices } from '../../../lib/ao/podcastRecordingLinks.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = String(auth).replace(/^Bearer\s+/i, '');
    if (provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const links = await sendDueRecordingLinks();
    const notices = await sendBartRecordingNotices();
    const result = { ok: links.ok && notices.ok, links, notices };
    console.log('[cron recording-links]', JSON.stringify(result));
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('[cron recording-links] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
