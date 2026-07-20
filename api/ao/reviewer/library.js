/**
 * GET /api/ao/reviewer/library
 *
 * Reviewer-scoped library data — LinkedIn, Facebook, Instagram, and X
 * content, matching the multi-platform distribution described in the
 * LinkedIn API application. Returns a small, filtered slice of the corpus
 * and scheduled posts, never the full library.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { logReviewerEvent } from '../../../lib/ao/reviewerAuditLog.js';

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
    // Posts across all four platforms this tool actually publishes to.
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, account_id, caption, text, scheduled_at, status, posted_at')
      .in('platform', ['linkedin', 'facebook', 'instagram', 'twitter'])
      .order('scheduled_at', { ascending: false })
      .limit(20);

    if (postsError) {
      console.warn('[reviewer/library] posts query failed:', postsError.message);
    }

    // A small, safe sample of corpus documents — titles and summaries only,
    // never body_preview, and capped low. This is meant to demonstrate the
    // corpus exists and informs content, not to hand over the library.
    const { data: corpusDocs, error: corpusError } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('slug, title, doc_type, summary')
      .in('doc_type', ['journal-post'])
      .order('updated_at', { ascending: false })
      .limit(8);

    if (corpusError) {
      console.warn('[reviewer/library] corpus query failed:', corpusError.message);
    }

    const safePosts = (posts || []).map((p) => ({
      id: p.id,
      platform: p.platform,
      caption: p.caption || p.text || '',
      scheduled_at: p.scheduled_at,
      status: p.status,
      posted_at: p.posted_at,
    }));

    await logReviewerEvent({
      eventType: 'page_viewed',
      route: '/api/ao/reviewer/library',
      method: 'GET',
      resultOk: true,
      req,
    });

    return res.status(200).json({
      ok: true,
      posts: safePosts,
      corpus_sample: corpusDocs || [],
      corpus_note:
        'This is a small sample from a larger internal content library used to inform what gets published.',
    });
  } catch (err) {
    console.error('[reviewer/library]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
