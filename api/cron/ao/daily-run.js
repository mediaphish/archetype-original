/**
 * Vercel cron — AO daily run (ready by 8am CT).
 *
 * What it does:
 * - Runs the allowlist-only external scan (capped).
 * - Generates Bart-voice drafts + suggested schedule for newly created external candidates.
 *
 * Secured by CRON_SECRET if set.
 */

import { runDailyRun } from '../../../lib/ao/runDailyRun.js';

function authorizeCron(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.authorization || req.query?.secret || '';
  const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
  if (provided !== cronSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!authorizeCron(req, res)) return;

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

