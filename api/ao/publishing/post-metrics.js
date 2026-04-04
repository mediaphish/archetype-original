/**
 * POST /api/ao/publishing/post-metrics
 * Upsert engagement metrics for a scheduled post (manual ingest or future channel API jobs).
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { upsertScheduledPostMetrics } from '../../../lib/ao/postMetrics.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const out = await upsertScheduledPostMetrics({
    scheduled_post_id: body.scheduled_post_id,
    platform: body.platform,
    external_id: body.external_id,
    posted_at_utc: body.posted_at_utc,
    impressions: body.impressions,
    clicks: body.clicks,
    reactions: body.reactions,
    comments: body.comments,
    shares: body.shares,
    engagement_score: body.engagement_score,
    raw: body.raw,
  });

  if (!out.ok) {
    return res.status(400).json({ ok: false, error: out.error || 'Upsert failed' });
  }
  return res.status(200).json({ ok: true });
}
