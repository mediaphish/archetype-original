/**
 * Content Draft API
 *
 * POST /api/ao/auto/content-draft — save or update an approved draft
 * GET  /api/ao/auto/content-draft?series_slug=X — get all drafts for a series
 * GET  /api/ao/auto/content-draft?status=approved — get all approved unpublished drafts
 *
 * This is called by Auto when Bart approves content in a session.
 * It persists the approved content so any future session can retrieve it.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const { series_slug, status, kind, slug } = req.query || {};

    let query = supabaseAdmin
      .from('ao_content_drafts')
      .select('*')
      .eq('created_by_email', auth.email)
      .order('part_number', { ascending: true });

    if (series_slug) query = query.eq('series_slug', series_slug);
    if (status) query = query.eq('status', status);
    if (kind) query = query.eq('kind', kind);
    if (slug) query = query.eq('slug', slug);

    const { data, error } = await query.limit(50);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, drafts: data || [] });
  }

  if (req.method === 'POST') {
    const {
      kind,
      series_slug,
      part_number,
      title,
      slug,
      content,
      summary,
      image_url,
      image_style,
      image_prompt,
      status,
      metadata,
    } = req.body || {};

    if (!kind || !series_slug || !content) {
      return res.status(400).json({
        ok: false,
        error: 'kind, series_slug, and content are required',
      });
    }

    // Upsert by owner + series_slug + part_number + kind
    const { data, error } = await supabaseAdmin
      .from('ao_content_drafts')
      .upsert(
        {
          created_by_email: auth.email,
          kind,
          series_slug,
          part_number: part_number || 1,
          title: title || null,
          slug: slug || null,
          content,
          summary: summary || null,
          image_url: image_url || null,
          image_style: image_style || null,
          image_prompt: image_prompt || null,
          status: status || 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: metadata || null,
        },
        {
          onConflict: 'created_by_email,series_slug,part_number,kind',
          ignoreDuplicates: false,
        }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[content-draft] Upsert failed:', error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, draft: data });
  }

  if (req.method === 'PATCH') {
    const { id, status, image_url, image_style, published_at } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (image_url) updates.image_url = image_url;
    if (image_style) updates.image_style = image_style;
    if (published_at) updates.published_at = published_at;

    const { data, error } = await supabaseAdmin
      .from('ao_content_drafts')
      .update(updates)
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, draft: data });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
