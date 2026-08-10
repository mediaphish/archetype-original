/**
 * GET /api/ao/auto/scheduled-posts-status
 *
 * Checks whether journal-launch social captions are already scheduled for a slug, so the
 * frontend can avoid showing a "schedule captions" prompt for a post that's already fully
 * queued. Read-only, no side effects.
 *
 * Query params:
 * - slug: required, the journal post's slug
 *
 * Response: { ok: true, scheduled_count: number, platforms: string[] }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'slug is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('platform')
      .eq('source_kind', 'journal_launch')
      .contains('intent', { journal_slug: slug })
      .neq('status', 'failed');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      scheduled_count: (data || []).length,
      platforms: (data || []).map((r) => r.platform),
    });
  } catch (err) {
    console.error('[scheduled-posts-status]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
