/**
 * Every six hours: Bit checks that everything is connected and working, saves
 * his report (ao_bit_reports) and emails Bart only when something newly broke
 * (or a break got fixed), plus one reminder for a team question left two days. Silence means all is well. See lib/ao/team/bit.js. Secured by
 * CRON_SECRET.
 */
import { runBit } from '../../../lib/ao/team/bit.js';
import { remindStaleQuestions } from '../../../lib/ao/team/runTask.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = String(auth).replace(/^Bearer\s+/i, '');
  if (!cronSecret || provided !== cronSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const result = await runBit({ notify: true });
    // A team question Bart has left two days gets one reminder (2026-11-09).
    const reminded = await remindStaleQuestions();
    return res.status(200).json({
      ok: true,
      checked_at: result.checked_at,
      not_ok: result.checks.filter((c) => c.status !== 'ok').map((c) => ({ key: c.key, status: c.status })),
      newly_wrong: result.newly_wrong,
      fixed: result.fixed,
      reminded: reminded.sent,
    });
  } catch (err) {
    console.error('[bit] run failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Bit could not run' });
  }
}
