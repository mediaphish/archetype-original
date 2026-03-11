/**
 * AO Automation — Internal corpus scan.
 * POST /api/ao/scan-internal?email=xxx
 * Reads public/knowledge.json, extracts quote candidates, evaluates, dedupes, inserts into ao_quote_review_queue.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { runInternalScan } from '../../lib/ao/runInternalScan.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const result = await runInternalScan();
  if (!result.ok) {
    const msg = String(result.error || 'Internal scan failed');
    if (msg.includes('ao_scan_log') || msg.includes('ao_quote_review_queue')) {
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
    candidates_found: result.candidatesFound ?? 0,
    candidates_evaluated: result.candidatesEvaluated ?? 0,
    candidates_inserted: result.candidatesInserted ?? 0,
    log_id: result.logId || null,
  });
}
