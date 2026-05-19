/**
 * Auto V2 — Schedule Status Route
 * Read-only. Returns current state of ao_scheduled_posts for Auto to report on.
 * Called by the UI or by Auto when Bart asks about publishing queue state.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Count by status
    const { data: statusCounts, error: countError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('status')
      .eq('source_kind', 'auto_quote_card');

    if (countError) throw countError;

    const counts = { scheduled: 0, posted: 0, failed: 0, pending: 0 };
    for (const row of statusCounts || []) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }

    // Next scheduled post
    const { data: nextPost, error: nextError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('platform, scheduled_at, image_url, caption')
      .eq('source_kind', 'auto_quote_card')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (nextError) throw nextError;

    // Spot check: verify first 5 scheduled image URLs contain today's or recent timestamps
    const { data: spotCheck, error: spotError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('platform, scheduled_at, image_url')
      .eq('source_kind', 'auto_quote_card')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (spotError) throw spotError;

    // Extract timestamps from image URLs for verification
    const urlCheck = (spotCheck || []).map((row) => {
      const match = row.image_url?.match(/card-\d+-(\d+)\.png/);
      const ts = match ? parseInt(match[1], 10) : null;
      const generated = ts ? new Date(ts).toISOString() : 'unknown';
      return {
        platform: row.platform,
        scheduled_at: row.scheduled_at,
        image_generated_at: generated,
        image_url: row.image_url,
      };
    });

    return res.status(200).json({
      ok: true,
      counts,
      next_post: nextPost?.[0] || null,
      url_spot_check: urlCheck,
    });
  } catch (err) {
    console.error('[schedule-status]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
