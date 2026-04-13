/**
 * PATCH /api/ao/corpus/drafts/:id — update status or fields
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const updates = { updated_at: new Date().toISOString() };

    if (body.meta != null && typeof body.meta === 'object' && !Array.isArray(body.meta)) {
      const { data: existingRow, error: fetchErr } = await supabaseAdmin
        .from('ao_corpus_drafts')
        .select('meta')
        .eq('id', id)
        .eq('created_by_email', auth.email)
        .maybeSingle();
      if (fetchErr) {
        return res.status(500).json({ ok: false, error: fetchErr.message });
      }
      const prevMeta = existingRow?.meta && typeof existingRow.meta === 'object' ? existingRow.meta : {};
      updates.meta = { ...prevMeta, ...body.meta };
    }

    if (['draft', 'approved', 'rejected', 'published'].includes(body.status)) {
      updates.status = body.status;
    }
    if (body.tldr_markdown != null) updates.tldr_markdown = String(body.tldr_markdown);
    if (body.outline_markdown != null) updates.outline_markdown = String(body.outline_markdown);
    if (body.full_markdown != null) updates.full_markdown = String(body.full_markdown);
    if (body.target_path != null) updates.target_path = String(body.target_path).slice(0, 500);
    if (body.topic != null) updates.topic = String(body.topic).slice(0, 500);
    if (Array.isArray(body.tags)) updates.tags = body.tags.map((t) => String(t).slice(0, 80)).filter(Boolean).slice(0, 24);

    const { data, error } = await supabaseAdmin
      .from('ao_corpus_drafts')
      .update(updates)
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    if (!data) {
      return res.status(404).json({ ok: false, error: 'Draft not found' });
    }
    return res.status(200).json({ ok: true, draft: data });
  } catch (e) {
    console.error('[ao/corpus/drafts/id]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
