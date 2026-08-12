/**
 * GET /api/ao/publishing/recommended-schedule
 * Prefill Publishing schedule fields from analytics-grounded recommendations.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getRecommendedSchedule } from '../../../lib/ao/scheduleHeuristic.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const platforms = req.query?.platform
      ? [String(req.query.platform)]
      : undefined;
    const count = req.query?.count ? Number(req.query.count) : 1;
    const report = await getRecommendedSchedule({ platforms, count });
    return res.status(200).json(report);
  } catch (err) {
    console.error('[recommended-schedule]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
