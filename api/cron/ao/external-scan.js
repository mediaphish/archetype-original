/**
 * Vercel cron — AO external scan.
 * Secured by CRON_SECRET if set.
 */

import { runExternalScan } from '../../../lib/ao/runExternalScan.js';

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

  const result = await runExternalScan();
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'External scan failed', log_id: result.logId || null });
  }
  return res.status(200).json({
    ok: true,
    candidates_found: result.candidatesFound ?? 0,
    candidates_evaluated: result.candidatesEvaluated ?? 0,
    candidates_inserted: result.candidatesInserted ?? 0,
    log_id: result.logId || null,
  });
}

