/**
 * AO Automation — Shape an idea into a decision-ready brief.
 * POST /api/ao/ideas/:id/shape-brief
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { shapeIdeaBrief } from '../../../../lib/ao/shapeIdeaBrief.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const { data: idea, error: fetchErr } = await supabaseAdmin
      .from('ao_ideas')
      .select('*')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    const shaped = await shapeIdeaBrief({ rawInput: idea.raw_input, sourceUrl: idea.source_url });
    if (!shaped.ok) {
      return res.status(500).json({ ok: false, error: shaped.error || 'Brief shaping failed' });
    }

    const nextStatus = idea.status === 'held' || idea.status === 'archived' ? idea.status : 'brief_ready';
    const titleToSet = (idea.title && String(idea.title).trim()) ? idea.title : (shaped.title_suggestion || null);

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('ao_ideas')
      .update({
        title: titleToSet,
        suggested_content_kind: shaped.content_kind || null,
        suggested_ao_lane: shaped.ao_lane || null,
        suggested_topic_tags: shaped.topic_tags || null,
        why_it_matters: shaped.why_it_matters || null,
        angles: shaped.angles || null,
        risks: shaped.risks || null,
        recommended_next_step: shaped.recommended_next_step || null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();

    if (updErr) return res.status(500).json({ ok: false, error: updErr.message });

    return res.status(200).json({ ok: true, idea: updated, meta: { what_is_missing: shaped.what_is_missing || [] } });
  } catch (e) {
    console.error('[ao/ideas shape-brief]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

