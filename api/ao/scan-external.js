/**
 * AO Automation — External scan (allowlist-only).
 * POST /api/ao/scan-external?email=xxx
 *
 * Reads curated sources from ao_external_sources, extracts candidate snippets,
 * evaluates + dedupes, inserts into ao_quote_review_queue.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { runExternalScan } from '../../lib/ao/runExternalScan.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  // Manual "run now" should be decision-ready: extract full article pages when possible
  // and immediately generate the Analyst brief for the newest items.
  const result = await runExternalScan({
    enrichAnalyst: true,
    enrichLimit: 8,
    fetchFullText: true,
    insertedCap: 20,
  });
  if (!result.ok) {
    const msg = String(result.error || 'External scan failed');
    if (msg.includes('ao_scan_log') || msg.includes('ao_external_sources') || msg.includes('ao_quote_review_queue')) {
      return res.status(500).json({
        ok: false,
        error: 'Scan tables are not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        log_id: result.logId || null,
      });
    }
    return res.status(500).json({ ok: false, error: msg, log_id: result.logId || null });
  }

  return res.status(200).json({
    ok: true,
    message: result.message || 'External scan completed',
    candidates_found: result.candidatesFound ?? 0,
    candidates_evaluated: result.candidatesEvaluated ?? 0,
    candidates_inserted: result.candidatesInserted ?? 0,
    log_id: result.logId || null,
  });
}
