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
import { logReviewerEvent } from '../../../lib/ao/reviewerAuditLog.js';

const VALID_PLATFORMS = ['linkedin_personal', 'linkedin_business', 'facebook', 'instagram', 'twitter'];

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
    await logReviewerEvent({
      eventType: 'content_upload_rejected',
      route: '/api/ao/reviewer/upload-content',
      method: 'POST',
      requestSummary: { reason: 'content_required' },
      resultOk: false,
      req,
    });
    return res.status(400).json({ ok: false, error: 'content is required' });
  }

  const selectedPlatforms = Array.isArray(platforms)
    ? platforms.filter((p) => VALID_PLATFORMS.includes(p))
    : [];

  if (selectedPlatforms.length === 0) {
    await logReviewerEvent({
      eventType: 'content_upload_rejected',
      route: '/api/ao/reviewer/upload-content',
      method: 'POST',
      requestSummary: { reason: 'platforms_required' },
      resultOk: false,
      req,
    });
    return res.status(400).json({ ok: false, error: 'Select at least one platform.' });
  }

  const imageUrl = String(image_url || '').trim() || null;

  if (selectedPlatforms.includes('instagram') && !imageUrl) {
    await logReviewerEvent({
      eventType: 'content_upload_rejected',
      route: '/api/ao/reviewer/upload-content',
      method: 'POST',
      requestSummary: { reason: 'instagram_requires_image', platforms: selectedPlatforms },
      resultOk: false,
      req,
    });
    return res.status(400).json({ ok: false, error: 'Instagram requires an image URL.' });
  }

  const caption = String(content).trim().slice(0, 3000);
  const scheduledAt = scheduled_at || new Date(Date.now() + 5 * 60 * 1000).toISOString();

  try {
    // LinkedIn Business is rejected here, not just disabled client-side — it must
    // never be possible to schedule a post against it via a direct API call.
    // Organization page publishing requires Community Management API access,
    // which has not been granted yet.
    if (selectedPlatforms.includes('linkedin_business')) {
      await logReviewerEvent({
        eventType: 'content_upload_rejected',
        route: '/api/ao/reviewer/upload-content',
        method: 'POST',
        requestSummary: { reason: 'linkedin_business_not_available', platforms: selectedPlatforms },
        resultOk: false,
        req,
      });
      return res.status(400).json({
        ok: false,
        error: 'LinkedIn Business publishing is pending LinkedIn approval and is not available yet.',
      });
    }

    const rows = selectedPlatforms.map((platform) => {
      // 'personal' is the connection that is actually approved and working right
      // now. LinkedIn Business ('page_1') requires the Community Management API
      // access this review is for and is blocked above before reaching this point.
      const accountId =
        platform === 'linkedin_personal' ? 'personal' :
        platform === 'facebook' ? 'meta' :
        platform === 'instagram' ? 'meta' :
        platform === 'twitter' ? 'personal' :
        'default';

      // Store as 'linkedin' in the platform column (matching the real schema and
      // adapter functions) but track the display distinction via intent.
      const storedPlatform = platform === 'linkedin_personal' ? 'linkedin' : platform;

      return {
        platform: storedPlatform,
        account_id: accountId,
        text: caption,
        caption,
        image_url: imageUrl,
        scheduled_at: scheduledAt,
        status: 'scheduled',
        source_kind: 'reviewer_upload',
        intent: { source: 'reviewer_dashboard', display_platform: platform },
      };
    });

    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert(rows)
      .select('id, platform, scheduled_at, status');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    await logReviewerEvent({
      eventType: 'content_uploaded',
      route: '/api/ao/reviewer/upload-content',
      method: 'POST',
      requestSummary: {
        platforms: selectedPlatforms,
        content_length: caption.length,
        has_image: !!imageUrl,
      },
      resultOk: true,
      resultSummary: { post_ids: (data || []).map((p) => p.id) },
      req,
    });

    return res.status(200).json({ ok: true, posts: data });
  } catch (err) {
    console.error('[reviewer/upload-content]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}

