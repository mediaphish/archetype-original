/**
 * POST /api/ao/reviewer/publish-now
 *
 * Publishes a reviewer-uploaded post immediately, using the same platform
 * adapter functions the real scheduling system uses. Supports LinkedIn,
 * Facebook, Instagram, and X — matching what the LinkedIn API application
 * describes as the tool's actual distribution.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { postToLinkedIn } from '../../../lib/social/linkedin.js';
import { postToFacebook } from '../../../lib/social/facebook.js';
import { postToInstagram } from '../../../lib/social/instagram.js';
import { postToTwitter } from '../../../lib/social/twitter.js';
import { logReviewerEvent } from '../../../lib/ao/reviewerAuditLog.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role !== 'reviewer') {
    return res.status(403).json({ ok: false, error: 'This endpoint is reviewer-only.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { post_id } = req.body || {};
  if (!post_id) {
    return res.status(400).json({ ok: false, error: 'post_id is required' });
  }

  try {
    const { data: post, error: fetchErr } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('*')
      .eq('id', post_id)
      .eq('source_kind', 'reviewer_upload')
      .single();

    if (fetchErr || !post) {
      return res.status(404).json({ ok: false, error: 'Post not found or not a reviewer upload.' });
    }

    const text = String(post.caption || post.text || '').trim();
    if (!text) {
      return res.status(400).json({ ok: false, error: 'Post has no caption to publish.' });
    }

    let result;
    if (post.platform === 'linkedin') {
      result = await postToLinkedIn({ text }, post.account_id || 'page_1');
    } else if (post.platform === 'facebook') {
      result = await postToFacebook({ text, imageUrl: post.image_url }, post.account_id || 'meta');
    } else if (post.platform === 'instagram') {
      result = await postToInstagram({ text, imageUrl: post.image_url }, post.account_id || 'meta');
    } else if (post.platform === 'twitter') {
      result = await postToTwitter({ text, imageUrl: post.image_url }, post.account_id || 'personal');
    } else {
      return res.status(400).json({ ok: false, error: `Unsupported platform: ${post.platform}` });
    }

    if (!result.success) {
      await supabaseAdmin
        .from('ao_scheduled_posts')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', post_id);

      await logReviewerEvent({
        eventType: 'publish_failed',
        route: '/api/ao/reviewer/publish-now',
        method: 'POST',
        requestSummary: { post_id, platform: post.platform },
        resultOk: false,
        resultSummary: { error: result.error },
        req,
      });

      return res.status(500).json({ ok: false, error: result.error, platform: post.platform });
    }

    await supabaseAdmin
      .from('ao_scheduled_posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        external_id: result.postId || null,
      })
      .eq('id', post_id);

    await logReviewerEvent({
      eventType: 'content_published',
      route: '/api/ao/reviewer/publish-now',
      method: 'POST',
      requestSummary: { post_id, platform: post.platform },
      resultOk: true,
      resultSummary: { external_post_id: result.postId || null },
      req,
    });

    return res.status(200).json({
      ok: true,
      platform: post.platform,
      post_id: result.postId || null,
    });
  } catch (err) {
    console.error('[reviewer/publish-now]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
