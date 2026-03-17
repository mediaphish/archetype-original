/**
 * Vercel cron — AO competitor digest (best-effort, public only).
 *
 * Secured by CRON_SECRET if set.
 */
import { runCompetitorDigest } from '../../../lib/ao/runCompetitorDigest.js';

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

  const out = await runCompetitorDigest({ insertedCap: 20 });
  if (!out.ok) return res.status(500).json({ ok: false, error: out.error || 'Competitor digest failed' });

  return res.status(200).json({
    ok: true,
    inserted: out.inserted || 0,
    candidates_found: out.candidates_found || 0,
  });
}

