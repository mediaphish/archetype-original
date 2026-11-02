/**
 * Every 15 minutes, between the publishing runs: Bit makes sure posts go live,
 * fixes what is safe to fix and emails Bart about what only he can settle. See
 * lib/ao/team/postGuard.js. Secured by CRON_SECRET.
 */
import { runPostGuard } from '../../../lib/ao/team/postGuard.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = String(auth).replace(/^Bearer\s+/i, '');
  if (!cronSecret || provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    return res.status(200).json(await runPostGuard({ notify: true }));
  } catch (err) {
    console.error('[post-guard] run failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'The post guard could not run' });
  }
}
