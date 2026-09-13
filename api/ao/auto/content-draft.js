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
 * - with_stage: pass "1" to also return the draft's workflow stage (journal only)
 *
 * Response: { ok: true, draft: { slug, title, content, kind, status, image_url }, stage? }
 *
 * with_stage exists for the staged artifact panel (notes/AUTO_STAGED_WORKSPACE_SPEC.md).
 * The stage is derived from the draft row and its caption rows, never from chat,
 * using the same caption match as Auto's get_schedule_status tool. Callers that
 * do not pass it get exactly the response they always did.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { contentDrafts } from '../../../lib/db/contentDrafts.js';
import { deriveDraftStage } from '../../../lib/ao/draftStage.js';
import { loadJournalCaptionRows } from '../../../lib/ao/getScheduleStatus.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { slug, series_slug, kind, include_published, with_stage } = req.query;
  const includePublished = String(include_published || '') === '1';
  const withStage = String(with_stage || '') === '1';

  if (!slug && !series_slug) {
    return res.status(400).json({ ok: false, error: 'slug or series_slug required' });
  }

  try {
    let query = contentDrafts()
      .select('id, slug, title, content, kind, status, image_url, approved_at, scheduled_publish_at, published_at, series_slug, part_number, updated_at')
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

    const draft = data[0];

    if (withStage && String(draft.kind || 'journal') === 'journal') {
      // A caption lookup failure must not cost Bart the draft itself. The
      // stage falls back to what the draft row alone can say.
      let captions = [];
      try {
        captions = await loadJournalCaptionRows(draft.slug);
      } catch (captionErr) {
        console.warn('[content-draft] caption lookup for stage failed:', captionErr?.message || captionErr);
      }
      return res.status(200).json({ ok: true, draft, stage: deriveDraftStage({ draft, captions }) });
    }

    return res.status(200).json({ ok: true, draft });
  } catch (err) {
    console.error('[content-draft]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
