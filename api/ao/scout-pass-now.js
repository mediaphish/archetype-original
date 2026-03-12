/**
 * AO Automation — Run one Scout pass now (owner-only).
 * POST /api/ao/scout-pass-now
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { runScoutPass } from '../../lib/ao/runScoutPass.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

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

