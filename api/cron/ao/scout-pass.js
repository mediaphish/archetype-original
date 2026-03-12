/**
 * Vercel cron — AO Scout pass (reporter-mode).
 * Secured by CRON_SECRET if set.
 */

import { runScoutPass } from '../../../lib/ao/runScoutPass.js';

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

  const result = await runScoutPass();
  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error || 'Scout pass failed', run_id: result.runId || null });
  }
  return res.status(200).json({
    ok: true,
    run_id: result.runId || null,
    pages_fetched: result.pagesFetched ?? 0,
    leads_followed: result.leadsFollowed ?? 0,
    discoveries_created: result.discoveriesCreated ?? 0,
    message: result.message || null,
  });
}

