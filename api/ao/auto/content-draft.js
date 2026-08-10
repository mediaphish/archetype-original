/**
 * GET /api/ao/auto/content-draft
 *
 * Fetches a specific draft from ao_content_drafts by slug or series_slug.
 * Used by Auto to retrieve full draft content on demand rather than having it
 * injected into every system prompt.
 *
 * Query params:
 * - slug: exact slug match
 * - series_slug: series slug match (returns most recent approved part)
 * - kind: optional filter (journal, devotional, captions)
 * - include_published: pass "1" to also return published drafts (default excludes them)
 *
 * Response: { ok: true, draft: { slug, title, content, kind, status, image_url } }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, series_slug, kind, include_published } = req.query;
  const includePublished = String(include_published || '') === '1';

  if (!slug && !series_slug) {
    return res.status(400).json({ ok: false, error: 'slug or series_slug required' });
  }

  try {
    let query = supabaseAdmin
      .from('ao_content_drafts')
      .select('slug, title, content, kind, status, image_url, approved_at, series_slug, part_number')
      .eq('created_by_email', auth.email.toLowerCase().trim())
      .order('approved_at', { ascending: false })
      .limit(1);

    if (!includePublished) {
      query = query.neq('status', 'published').neq('status', 'abandoned');
    }

    if (slug) query = query.eq('slug', slug);
    if (series_slug) query = query.eq('series_slug', series_slug);
    if (kind) query = query.eq('kind', kind);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ ok: false, error: 'Draft not found' });
    }

    return res.status(200).json({ ok: true, draft: data[0] });
  } catch (err) {
    console.error('[content-draft]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
