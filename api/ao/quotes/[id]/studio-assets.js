/**
 * AO Automation — Studio: generate drafts + optional quote card for a quote item.
 * POST /api/ao/quotes/[id]/studio-assets
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { analystDecision } from '../../../../lib/ao/analystDecision.js';
import { editorCompose } from '../../../../lib/ao/editorCompose.js';
import { renderQuoteCardSvg } from '../../../../lib/ao/quoteCardDesigner.js';

function hasBrief(row) {
  return !!(row?.pull_quote && row?.why_it_matters && row?.summary_interpretation && row?.ao_lane);
}

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

    const decision = hasBrief(row) ? { ok: true, ...row } : await analystDecision(row);
    if (!decision?.ok) {
      return res.status(500).json({ ok: false, error: 'Could not generate brief' });
    }
    if (decision.auto_discarded || decision.best_move === 'discard') {
      return res.status(400).json({ ok: false, error: 'This item is marked as discard and cannot be drafted.' });
    }

    const composed = await editorCompose(row, decision);
    if (!composed?.ok) {
      return res.status(500).json({ ok: false, error: 'Could not generate drafts' });
    }

    let quoteCard = null;
    if (decision.best_move === 'pull_quote_card' && decision.quote_card_worthy && decision.pull_quote) {
      const rendered = renderQuoteCardSvg({ quote: decision.pull_quote, sourceName: row.source_name || row.source_title || '' });
      if (rendered?.ok) {
        quoteCard = {
          quote_card_template: rendered.template,
          quote_card_svg: rendered.svg,
          quote_card_caption: composed.drafts_by_channel?.instagram || null,
        };
      }
    }

    const patch = {
      // If we had to generate the brief, persist it so Studio and Publisher agree.
      ...(hasBrief(row) ? {} : {
        best_move: decision.best_move || null,
        objectives_by_channel: decision.objectives_by_channel || null,
        why_it_matters: decision.why_it_matters || null,
        pull_quote: decision.pull_quote || null,
        risk_flags: Array.isArray(decision.risk_flags) ? decision.risk_flags : null,
        summary_interpretation: decision.summary_interpretation || null,
        alt_moves: decision.alt_moves || null,
        content_kind: decision.content_kind || null,
        ao_lane: decision.ao_lane || null,
        topic_tags: Array.isArray(decision.topic_tags) ? decision.topic_tags : null,
        auto_discarded: !!decision.auto_discarded,
        discard_reason: decision.discard_reason || null,
      }),
      drafts_by_channel: composed.drafts_by_channel,
      hashtags_by_channel: composed.hashtags_by_channel,
      first_comment_suggestions: composed.first_comment_suggestions,
      ...(quoteCard || {}),
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
      const missingDraftColumns =
        msg.includes('drafts_by_channel') ||
        msg.includes('hashtags_by_channel') ||
        msg.includes('first_comment_suggestions');
      if (missingDraftColumns) {
        return res.status(500).json({
          ok: false,
          error: 'Draft fields are not set up yet. Run database/ao_quote_review_queue_add_drafts.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: updErr.message });
    }

    return res.status(200).json({ ok: true, quote: updated });
  } catch (e) {
    console.error('[ao/quotes/studio-assets]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

