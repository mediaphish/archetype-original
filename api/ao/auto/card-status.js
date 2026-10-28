/**
 * POST /api/ao/auto/card-status { urls: [image_url] } -> { ok, statuses: { url: { status, scheduled_at } } }
 * For the panel: whether each card Bart sees is queued yet (2026-10-28).
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { cardStatuses } from '../../../lib/ao/scheduleQuoteCard.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  return res.status(200).json({ ok: true, statuses: await cardStatuses(body.urls) });
}
