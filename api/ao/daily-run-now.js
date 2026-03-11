/**
 * AO Automation — Run daily flow now (owner-only).
 * POST /api/ao/daily-run-now
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { runDailyRun } from '../../lib/ao/runDailyRun.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const result = await runDailyRun();
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'Daily run failed', run_log_id: result.runLogId || null });
  }
  return res.status(200).json({
    ok: true,
    run_log_id: result.runLogId,
    external_candidates_found: result.externalCandidatesFound ?? 0,
    external_candidates_inserted: result.externalCandidatesInserted ?? 0,
    drafted_count: result.draftedCount ?? 0,
  });
}

