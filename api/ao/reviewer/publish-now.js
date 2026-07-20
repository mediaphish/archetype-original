/**
 * POST /api/ao/reviewer/publish-now
 *
 * Publishes a reviewer-uploaded post to LinkedIn immediately, using the same
 * postToLinkedIn function the real scheduling system uses. This is the
 * moment in the demo where the reviewer sees the Community Management API
 * actually fire and the post land on the organization page.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { postToLinkedIn } from '../../../lib/social/linkedin.js';

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

    // postToLinkedIn(options, accountId) — accountId is the second argument.
    const result = await postToLinkedIn({ text }, 'page_1');

    if (!result.success) {
      await supabaseAdmin
        .from('ao_scheduled_posts')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', post_id);
      return res.status(500).json({ ok: false, error: result.error });
    }

    await supabaseAdmin
      .from('ao_scheduled_posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        external_id: result.postId || null,
      })
      .eq('id', post_id);

    return res.status(200).json({
      ok: true,
      post_url: null,
      post_id: result.postId || null,
    });
  } catch (err) {
    console.error('[reviewer/publish-now]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
