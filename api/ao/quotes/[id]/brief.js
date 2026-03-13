/**
 * AO Automation — Generate / refresh Analyst brief for a quote item.
 * POST /api/ao/quotes/[id]/brief
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { analystDecision } from '../../../../lib/ao/analystDecision.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Quote ID required' });
  }

  try {
    const { data: row, error: readErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', id)
      .single();
    if (readErr) {
      if (readErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Quote not found' });
      return res.status(500).json({ ok: false, error: readErr.message });
    }

    const brief = await analystDecision(row);
    if (!brief?.ok) {
      return res.status(500).json({ ok: false, error: 'Could not generate brief' });
    }

    const patch = {
      best_move: brief.best_move || null,
      objectives_by_channel: brief.objectives_by_channel || null,
      why_it_matters: brief.why_it_matters || null,
      pull_quote: brief.pull_quote || null,
      risk_flags: Array.isArray(brief.risk_flags) ? brief.risk_flags : null,
      summary_interpretation: brief.summary_interpretation || null,
      alt_moves: brief.alt_moves || null,
      auto_discarded: !!brief.auto_discarded,
      discard_reason: brief.discard_reason || null,
      content_kind: brief.content_kind || null,
      ao_lane: brief.ao_lane || null,
      topic_tags: Array.isArray(brief.topic_tags) ? brief.topic_tags : null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) {
      const msg = String(updErr.message || '');
      const looksLikeMissingColumns =
        msg.includes('best_move') ||
        msg.includes('why_it_matters') ||
        msg.includes('pull_quote') ||
        msg.includes('risk_flags') ||
        msg.includes('summary_interpretation') ||
        msg.includes('alt_moves') ||
        msg.includes('content_kind') ||
        msg.includes('ao_lane') ||
        msg.includes('topic_tags');
      if (looksLikeMissingColumns) {
        return res.status(500).json({
          ok: false,
          error: 'Brief fields are not set up yet. Run database/ao_quote_review_queue_intelligence_fields.sql and database/ao_quote_review_queue_brief_and_hold_fields.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: updErr.message });
    }

    return res.status(200).json({ ok: true, quote: updated });
  } catch (e) {
    console.error('[ao/quotes/brief]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

