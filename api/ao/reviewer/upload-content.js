/**
 * POST /api/ao/reviewer/upload-content
 *
 * Accepts pasted text content from a reviewer session and stores it as a
 * draft scheduled post. This is intentionally the only way a reviewer can
 * get content into the system — no chat, no generation, just upload.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role !== 'reviewer') {
    return res.status(403).json({ ok: false, error: 'This endpoint is reviewer-only.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { content, scheduled_at } = req.body || {};

  if (!String(content || '').trim()) {
    return res.status(400).json({ ok: false, error: 'content is required' });
  }

  const caption = String(content).trim().slice(0, 3000);

  try {
    // Schema requires platform in (linkedin|facebook|instagram|twitter),
    // account_id, and text. Organization page posts use account_id page_1.
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert({
        platform: 'linkedin',
        account_id: 'page_1',
        text: caption,
        caption,
        scheduled_at: scheduled_at || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        status: 'scheduled',
        source_kind: 'reviewer_upload',
        intent: { source: 'reviewer_dashboard' },
      })
      .select('id, platform, scheduled_at, status')
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, post: data });
  } catch (err) {
    console.error('[reviewer/upload-content]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
