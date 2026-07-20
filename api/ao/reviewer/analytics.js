/**
 * GET /api/ao/reviewer/analytics
 *
 * Returns performance data for posts published through the reviewer flow
 * across LinkedIn, Facebook, Instagram, and X.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role !== 'reviewer') {
    return res.status(403).json({ ok: false, error: 'This endpoint is reviewer-only.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data: posts, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, caption, text, status, posted_at, external_id')
      .in('platform', ['linkedin', 'facebook', 'instagram', 'twitter'])
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const list = posts || [];
    const ids = list.map((p) => p.id).filter(Boolean);

    let metricsByPostId = {};
    if (ids.length > 0) {
      const { data: metrics } = await supabaseAdmin
        .from('ao_scheduled_post_metrics')
        .select('scheduled_post_id, reactions, comments, shares')
        .in('scheduled_post_id', ids);

      for (const m of metrics || []) {
        metricsByPostId[m.scheduled_post_id] = m;
      }
    }

    const enriched = list.map((p) => {
      const m = metricsByPostId[p.id] || {};
      return {
        id: p.id,
        platform: p.platform,
        caption: p.caption || p.text || '',
        status: p.status,
        posted_at: p.posted_at,
        platform_post_id: p.external_id || null,
        engagement_likes: m.reactions ?? 0,
        engagement_comments: m.comments ?? 0,
        engagement_shares: m.shares ?? 0,
      };
    });

    return res.status(200).json({ ok: true, posts: enriched });
  } catch (err) {
    console.error('[reviewer/analytics]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
