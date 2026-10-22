/**
 * Vercel cron: re-apply Bart's conversation hours in Calendly once a day.
 *
 * The booking webhook does this the moment someone books or cancels. This is
 * the safety net for a missed webhook, and it also rolls the date blocks
 * forward as new weeks come into the booking window.
 * Secured by CRON_SECRET if set.
 */

import { applyConversationHours, calendlyToken } from '../../lib/calendly/client.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = String(auth).replace(/^Bearer\s+/i, '');
    if (provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  if (!calendlyToken()) return res.status(200).json({ ok: false, error: 'CALENDLY_API_TOKEN is not set' });
  try {
    const result = await applyConversationHours();
    console.log('[calendly-hours]', JSON.stringify(result));
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('[calendly-hours] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
