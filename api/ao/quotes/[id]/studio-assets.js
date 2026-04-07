/**
 * AO Automation — Studio: generate drafts + optional quote card for a quote item.
 * POST /api/ao/quotes/[id]/studio-assets
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { analystDecision } from '../../../../lib/ao/analystDecision.js';
import { editorCompose } from '../../../../lib/ao/editorCompose.js';
import { renderQuoteCardSvg } from '../../../../lib/ao/quoteCardDesigner.js';
import { getDefaultLogoUrl } from '../../../../lib/ao/brandLogos.js';
import { inlineLogoForQuoteCardSvg } from '../../../../lib/ao/remoteAssetDataUrl.js';
import { uploadMinimalQuoteCardToPublicUrl } from '../../../../lib/ao/quoteCardImageUrl.js';

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
  const only = String(req.query?.only || '').trim().toLowerCase(); // 'quote_card' to regenerate card only

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

    const composed = only === 'quote_card'
      ? { ok: true, drafts_by_channel: row.drafts_by_channel || null, hashtags_by_channel: row.hashtags_by_channel || null, first_comment_suggestions: row.first_comment_suggestions || null }
      : await editorCompose(row, decision);
    if (!composed?.ok) {
      return res.status(500).json({ ok: false, error: only === 'quote_card' ? 'Could not load current drafts' : 'Could not generate drafts' });
    }

    let quoteCard = null;
    if ((only === 'quote_card' || decision.best_move === 'pull_quote_card') && decision.pull_quote) {
      const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
      const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
      const rendered = renderQuoteCardSvg({
        quote: decision.pull_quote,
        sourceName: row.source_name || row.source_title || '',
        logoUrl,
        style: 'minimal',
        minimalVariant: 'dark',
      });
      if (rendered?.ok) {
        quoteCard = {
          quote_card_template: rendered.template,
          quote_card_svg: rendered.svg,
          quote_card_caption: (row.quote_card_caption ?? composed.drafts_by_channel?.instagram) || null,
        };
        try {
          const up = await uploadMinimalQuoteCardToPublicUrl(
            {
              quote: decision.pull_quote,
              sourceName: row.source_name || row.source_title || '',
              logoUrl,
            },
            { subfolder: 'studio-quote-cards' }
          );
          if (up.ok) quoteCard.quote_card_image_url = up.publicUrl;
        } catch (_) {
          /* parity PNG optional if storage fails */
        }
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
        studio_playbook: decision.studio_playbook || null,
        auto_discarded: !!decision.auto_discarded,
        discard_reason: decision.discard_reason || null,
      }),
      ...(only === 'quote_card' ? {} : {
        drafts_by_channel: composed.drafts_by_channel,
        hashtags_by_channel: composed.hashtags_by_channel,
        first_comment_suggestions: composed.first_comment_suggestions,
      }),
      ...(quoteCard || {}),
      updated_at: new Date().toISOString(),
    };

    let updated = null;
    let updErr = null;
    try {
      const out = await supabaseAdmin
        .from('ao_quote_review_queue')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      updated = out.data;
      updErr = out.error;
      if (updErr) throw updErr;
    } catch (e2) {
      const msg = String(e2?.message || e2 || '');
      const missingAltMoves = msg.includes('alt_moves');
      const missingDraftColumns =
        msg.includes('drafts_by_channel') ||
        msg.includes('hashtags_by_channel') ||
        msg.includes('first_comment_suggestions');
      const missingPlaybook = msg.includes('studio_playbook');

      if (missingDraftColumns) {
        return res.status(500).json({
          ok: false,
          error: 'Draft fields are not set up yet. Run database/ao_quote_review_queue_add_drafts.sql in Supabase.',
        });
      }

      // If the DB is missing some intelligence columns (like alt_moves),
      // still save the drafts/quote card so Studio is usable.
      if (missingAltMoves || missingPlaybook || msg.includes('best_move') || msg.includes('why_it_matters') || msg.includes('pull_quote')) {
        const minimalPatch = {
          ...(only === 'quote_card' ? {} : {
            drafts_by_channel: composed.drafts_by_channel,
            hashtags_by_channel: composed.hashtags_by_channel,
            first_comment_suggestions: composed.first_comment_suggestions,
          }),
          ...(quoteCard || {}),
          updated_at: new Date().toISOString(),
        };
        const out2 = await supabaseAdmin
          .from('ao_quote_review_queue')
          .update(minimalPatch)
          .eq('id', id)
          .select('*')
          .single();
        if (out2.error) {
          return res.status(500).json({
            ok: false,
            error: 'Some Studio fields are missing in the database. Run database/ao_quote_review_queue_intelligence_fields.sql and database/ao_quote_review_queue_add_drafts.sql in Supabase.',
          });
        }
        return res.status(200).json({ ok: true, quote: out2.data });
      }

      throw e2;
    }

    return res.status(200).json({ ok: true, quote: updated });
  } catch (e) {
    console.error('[ao/quotes/studio-assets]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

