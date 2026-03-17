/**
 * AO Automation — run competitor digest now.
 * POST /api/ao/competitors/digest-now
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { runCompetitorDigest } from '../../../lib/ao/runCompetitorDigest.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const out = await runCompetitorDigest({ insertedCap: 20 });
  if (!out.ok) return res.status(500).json({ ok: false, error: out.error || 'Competitor digest failed' });

  return res.status(200).json({
    ok: true,
    inserted: out.inserted || 0,
    candidates_found: out.candidates_found || 0,
    attempted_platforms: out.attempted_platforms || {},
    reachable_platforms: out.reachable_platforms || {},
    message: out.message || null,
  });
}

