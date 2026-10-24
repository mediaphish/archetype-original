/**
 * AO — Generate weekly corpus pull bundle now (logged-in owner).
 * POST /api/ao/weekly-pull-bundle-now
 * Body (optional): { query?: string, limit?: number, force?: boolean, auto?: boolean }
 */

import { keepQuoteCardsRunning } from '../../lib/ao/autoQuoteCards.js';
import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { seedWeeklyCorpusPullBundle } from '../../lib/ao/seedWeeklyCorpusPullBundle.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  // { auto: true } does what the Monday job does: keep about two weeks of
  // cards queued and schedule them straight onto every channel.
  if (req.body?.auto) {
    const run = await keepQuoteCardsRunning({ email: auth.email });
    return res.status(run.ok ? 200 : 500).json(run);
  }

  const queryText = String(req.body?.query || '').trim() || undefined;
  const limit = Math.min(5, Math.max(3, Number(req.body?.limit) || 5));
  const force = !!req.body?.force;

  const result = await seedWeeklyCorpusPullBundle({
    email: auth.email,
    queryText,
    limit,
    force,
  });

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'Failed' });
  }
  return res.status(200).json(result);
}
