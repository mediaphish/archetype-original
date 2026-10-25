/**
 * Reach's week for Bart's screens (the Queue). GET ?week=this|next|YYYY-MM-DD.
 * Same view Reach itself reads with the reach_week tool.
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { getReachWeek } from '../../../lib/ao/reach/reachWeek.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const week = String(req.query?.week || 'this').trim() || 'this';
    return res.status(200).json(await getReachWeek({ week }));
  } catch (err) {
    console.error('[reach/week]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
