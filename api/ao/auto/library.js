/**
 * GET /api/ao/auto/library
 *
 * Returns:
 * - Full corpus: all documents from ao_corpus_embeddings (no embedding column)
 * - Corpus stats: document count by type
 * - Published/scheduled journal social posts
 * - Approved drafts pending publish
 * - Reshare queue
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { search = '', type = '', limit = '50', offset = '0' } = req.query;

  try {
    // --- CORPUS BROWSER ---
    // All documents from the vector DB, no embedding column (too large)
    let corpusQuery = supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('slug, title, doc_type, categories, summary, body_preview, updated_at', { count: 'exact' })
      .order('doc_type', { ascending: true })
      .order('title', { ascending: true })
      .range(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 50) - 1);

    if (type) {
      corpusQuery = corpusQuery.eq('doc_type', type);
    }

    if (search && search.trim().length > 1) {
      const q = `%${search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      corpusQuery = corpusQuery.or(`title.ilike.${q},summary.ilike.${q}`);
    }

    const { data: corpusDocs, error: corpusError, count: corpusTotal } = await corpusQuery;

    if (corpusError) {
      console.error('[library] corpus query failed:', corpusError.message);
    }

    // Corpus stats: count by type
    const { data: typeStats } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('doc_type');

    const statsByType = {};
    for (const row of typeStats || []) {
      const t = row.doc_type || 'other';
      statsByType[t] = (statsByType[t] || 0) + 1;
    }

    // --- SCHEDULED POSTS ---
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, scheduled_at, status, caption, image_url, error_message, intent, source_kind')
      .in('source_kind', ['journal_launch', 'ao_journal_social', 'ao_journal_reshare'])
      .order('scheduled_at', { ascending: false })
      .limit(200);

    if (postsError) {
      console.warn('[library] posts query failed:', postsError.message);
    }

    // Group posts by journal slug
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

    // --- RESHARE QUEUE ---
    const { data: reshareQueue, error: reshareError } = await supabaseAdmin
      .from('ao_reshare_queue')
      .select('slug, title, last_reshared_at, reshare_count, paused')
      .order('last_reshared_at', { ascending: true, nullsFirst: true })
      .limit(10);

    if (reshareError) {
      console.warn('[library] reshare queue unavailable:', reshareError.message);
    }

    // --- APPROVED DRAFTS ---
    const { data: drafts } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('slug, title, status, approved_at, image_url, kind, series_slug, part_number')
      .eq('created_by_email', auth.email)
      .in('kind', ['journal', 'devotional'])
      .neq('status', 'published')
      .neq('status', 'abandoned')
      .order('approved_at', { ascending: false })
      .limit(50);

    return res.status(200).json({
      ok: true,
      corpus: corpusDocs || [],
      corpus_total: corpusTotal || 0,
      corpus_stats: statsByType,
      entries: Object.values(bySlug),
      drafts: drafts || [],
      reshare_queue: reshareQueue || [],
    });
  } catch (err) {
    console.error('[library]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
