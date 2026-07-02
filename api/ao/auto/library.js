/**
 * GET /api/ao/auto/library
 *
 * Returns published and scheduled journal entries with their social post status.
 * Used by the Library page (/ao/library) to show Bart what is live,
 * what is queued, and what has failed — without going to Supabase.
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
    // Get all journal and journal_launch social posts, grouped by slug
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, scheduled_at, status, text, caption, image_url, error_message, intent, source_kind')
      .in('source_kind', ['journal_launch', 'ao_journal_social'])
      .order('scheduled_at', { ascending: false })
      .limit(200);

    if (postsError) {
      return res.status(500).json({ ok: false, error: postsError.message });
    }

    // Group by journal slug
    const bySlug = {};
    for (const post of posts || []) {
      const slug = post.intent?.journal_slug || post.intent?.slug || 'unknown';
      if (!bySlug[slug]) {
        bySlug[slug] = {
          slug,
          journal_url: post.intent?.journal_url || `https://www.archetypeoriginal.com/journal/${slug}`,
          posts: [],
        };
      }
      bySlug[slug].posts.push(post);
    }

    // Also pull content drafts so Bart can see approved-but-unpublished entries
    const { data: drafts } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('slug, title, status, publish_date, approved_at, image_url')
      .eq('created_by_email', auth.email)
      .eq('kind', 'journal')
      .order('approved_at', { ascending: false })
      .limit(50);

    return res.status(200).json({
      ok: true,
      entries: Object.values(bySlug),
      drafts: drafts || [],
    });
  } catch (err) {
    console.error('[library]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
