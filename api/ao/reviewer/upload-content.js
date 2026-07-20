/**
 * POST /api/ao/reviewer/upload-content
 *
 * Accepts pasted text content from a reviewer session and stores it as a
 * draft scheduled post, one row per selected platform. No chat, no
 * generation — the reviewer pastes text and picks platforms, matching the
 * multi-platform distribution described in the LinkedIn API application.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const VALID_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'twitter'];

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role !== 'reviewer') {
    return res.status(403).json({ ok: false, error: 'This endpoint is reviewer-only.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { content, image_url, platforms, scheduled_at } = req.body || {};

  if (!String(content || '').trim()) {
    return res.status(400).json({ ok: false, error: 'content is required' });
  }

  const selectedPlatforms = Array.isArray(platforms)
    ? platforms.filter((p) => VALID_PLATFORMS.includes(p))
    : [];

  if (selectedPlatforms.length === 0) {
    return res.status(400).json({ ok: false, error: 'Select at least one platform.' });
  }

  const imageUrl = String(image_url || '').trim() || null;

  if (selectedPlatforms.includes('instagram') && !imageUrl) {
    return res.status(400).json({ ok: false, error: 'Instagram requires an image URL.' });
  }

  const caption = String(content).trim().slice(0, 3000);
  const scheduledAt = scheduled_at || new Date(Date.now() + 5 * 60 * 1000).toISOString();

  try {
    const rows = selectedPlatforms.map((platform) => {
      const accountId =
        platform === 'linkedin' ? 'page_1' :
        platform === 'facebook' ? 'meta' :
        platform === 'instagram' ? 'meta' :
        platform === 'twitter' ? 'personal' :
        'default';

      return {
        platform,
        account_id: accountId,
        text: caption,
        caption,
        image_url: imageUrl,
        scheduled_at: scheduledAt,
        status: 'scheduled',
        source_kind: 'reviewer_upload',
        intent: { source: 'reviewer_dashboard' },
      };
    });

    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert(rows)
      .select('id, platform, scheduled_at, status');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, posts: data });
  } catch (err) {
    console.error('[reviewer/upload-content]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
