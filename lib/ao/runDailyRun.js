import { supabaseAdmin } from '../supabase-admin.js';
import { runExternalScan } from './runExternalScan.js';
import { analystDecision } from './analystDecision.js';
import { editorCompose } from './editorCompose.js';
import { renderQuoteCardSvg } from './quoteCardDesigner.js';
import { librarianAnnotate } from './librarianAnnotate.js';
import { buildExternalSourcesFromPrompt, DEFAULT_SCOUT_SOURCES_PROMPT } from './autoExternalSources.js';
import { getDefaultLogoUrl } from './brandLogos.js';
import { inlineLogoForQuoteCardSvg } from './remoteAssetDataUrl.js';
import { uploadMinimalQuoteCardToPublicUrl } from './quoteCardImageUrl.js';

function buildSuggestedSchedule(now = new Date()) {
  const base = new Date(now.getTime());
  const iso = (d) => new Date(d.getTime()).toISOString();
  const inHours = (h) => new Date(base.getTime() + h * 60 * 60 * 1000);
  return {
    timezone: 'America/Chicago',
    slots: [
      { kind: 'morning', recommended_at_utc: iso(inHours(3)) },
      { kind: 'midday', recommended_at_utc: iso(inHours(7)) },
    ],
  };
}

/**
 * Daily run: external scan → Analyst → Editor → Designer → Librarian.
 * Then: apply the same pipeline to a small batch of internal items.
 */
export async function runDailyRun() {
  let runLogId = null;
  try {
    const { data: runLog, error: runLogErr } = await supabaseAdmin
      .from('ao_scan_log')
      .insert({
        scan_type: 'full_corpus',
        started_at: new Date().toISOString(),
        candidates_found: 0,
        candidates_inserted: 0,
      })
      .select('id,started_at')
      .single();
    if (runLogErr) return { ok: false, error: runLogErr.message };
    runLogId = runLog?.id || null;

    // Keep Review manageable: auto-reject any pending items older than 14 days (held items are excluded).
    try {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({
          status: 'rejected',
          auto_discarded: true,
          discard_reason: 'Expired after 14 days',
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'pending')
        .lt('created_at', cutoff);
    } catch (_) {}

    // If the allowlist is empty, rebuild it before scanning.
    try {
      const { count } = await supabaseAdmin
        .from('ao_external_sources')
        .select('id', { count: 'exact', head: true });
      const total = typeof count === 'number' ? count : 0;
      if (total === 0) {
        const built = await buildExternalSourcesFromPrompt({ promptText: process.env.AO_SCOUT_SOURCES_PROMPT || DEFAULT_SCOUT_SOURCES_PROMPT, targetCount: 20 });
        const verified = built?.verified || [];
        if (verified.length) {
          await supabaseAdmin
            .from('ao_external_sources')
            .insert(verified.map((v) => ({
              url: v.feed_url,
              name: `AI — ${String(v.name || '').trim()}`.slice(0, 120),
              source_type: 'rss',
              origin: 'ai',
              is_protected: false,
              created_at: new Date().toISOString(),
            })));
        }
      }
    } catch (_) {}

    // Scout: pull a wider net, then Analyst will aggressively filter down to 5/day.
    const scan = await runExternalScan({ insertedCap: 30, candidatesCap: 200, sourcesLimit: 25, entriesPerSource: 10 });
    if (!scan.ok) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: scan.error || 'External scan failed' })
        .eq('id', runLogId);
      return { ok: false, error: scan.error || 'External scan failed', runLogId };
    }

    const sinceIso = runLog?.started_at || new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentQuotes, error: quotesErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('is_internal', false)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(60);
    if (quotesErr) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: quotesErr.message })
        .eq('id', runLogId);
      return { ok: false, error: quotesErr.message, runLogId };
    }

    const candidates = (recentQuotes || []).filter((q) => !q.auto_discarded);
    const analyzed = [];
    const decisionsById = new Map();

    for (const q of candidates) {
      // Skip rows already enriched
      if (q.best_move || q.why_it_matters || q.pull_quote) continue;

      const decision = await analystDecision(q);
      decisionsById.set(q.id, decision);

      const suggested_channels = ['linkedin', 'facebook', 'instagram', 'x'];
      const suggested_schedule = buildSuggestedSchedule(new Date());

      const autoDiscard = !!decision.auto_discarded || decision.best_move === 'discard';
      const updatePayload = {
        suggested_channels,
        suggested_schedule,
        best_move: decision.best_move,
        objectives_by_channel: decision.objectives_by_channel,
        why_it_matters: decision.why_it_matters,
        content_kind: decision.content_kind,
        ao_lane: decision.ao_lane,
        topic_tags: decision.topic_tags,
        pull_quote: decision.pull_quote,
        risk_flags: decision.risk_flags,
        summary_interpretation: decision.summary_interpretation,
        alt_moves: decision.alt_moves,
        auto_discarded: autoDiscard,
        discard_reason: autoDiscard ? decision.discard_reason || 'Auto-discarded' : null,
        // Replace placeholder with the pull quote so Review list reads as a pull quote immediately.
        quote_text: decision.pull_quote ? String(decision.pull_quote).slice(0, 500) : q.quote_text,
        updated_at: new Date().toISOString(),
      };

      try {
        const { error: updErr } = await supabaseAdmin
          .from('ao_quote_review_queue')
          .update(updatePayload)
          .eq('id', q.id);
        if (updErr) throw updErr;
      } catch (e2) {
        // If the new columns aren't present yet, fall back to the existing fields.
        const minimal = {
          suggested_channels,
          suggested_schedule,
          updated_at: new Date().toISOString(),
          quote_text: decision.pull_quote ? String(decision.pull_quote).slice(0, 500) : q.quote_text,
        };
        await supabaseAdmin
          .from('ao_quote_review_queue')
          .update(minimal)
          .eq('id', q.id);
      }

      if (!autoDiscard) {
        analyzed.push({ id: q.id, score: decision.publishability_score || 0 });
      } else {
        // Hide auto-discarded items from Review list
        await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', q.id);
      }
    }

    // Enforce 5/day cap: keep top 5 by publishability_score; discard the rest (hidden).
    analyzed.sort((a, b) => (b.score || 0) - (a.score || 0));
    const keep = new Set(analyzed.slice(0, 5).map((x) => x.id));
    const toHide = analyzed.slice(5).map((x) => x.id);
    if (toHide.length > 0) {
      await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({ status: 'rejected', auto_discarded: true, discard_reason: 'Over daily cap', updated_at: new Date().toISOString() })
        .in('id', toHide);
    }

    // Editor + Designer + Librarian for the kept set.
    const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
    const defaultLogoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
    let drafted = 0;
    for (const id of keep) {
      const row = (recentQuotes || []).find((r) => r.id === id);
      const decision = decisionsById.get(id);
      if (!row || !decision) continue;

      const composed = await editorCompose(row, decision);
      if (!composed?.ok) continue;

      // Designer: generate a quote card only when threshold is met.
      let quoteCard = null;
      if (decision.best_move === 'pull_quote_card' && decision.quote_card_worthy && decision.pull_quote) {
        const rendered = renderQuoteCardSvg({
          quote: decision.pull_quote,
          sourceName: row.source_name || row.source_title || '',
          logoUrl: defaultLogoUrl,
          style: 'minimal',
          minimalVariant: 'dark',
        });
        if (rendered.ok) {
          quoteCard = {
            quote_card_template: rendered.template,
            quote_card_svg: rendered.svg,
            // Use the Instagram draft as the default “caption” for the quote card.
            quote_card_caption: composed.drafts_by_channel?.instagram || null,
          };
          try {
            const up = await uploadMinimalQuoteCardToPublicUrl(
              { quote: decision.pull_quote, sourceName: row.source_name || row.source_title || '', logoUrl: defaultLogoUrl },
              { subfolder: 'review-queue-quote-cards' }
            );
            if (up.ok) quoteCard.quote_card_image_url = up.publicUrl;
          } catch (_) {}
        }
      }

      const lib = await librarianAnnotate({ candidateRow: row, decision });

      try {
        const { error: updErr } = await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({
            drafts_by_channel: composed.drafts_by_channel,
            hashtags_by_channel: composed.hashtags_by_channel,
            first_comment_suggestions: composed.first_comment_suggestions,
            ...(quoteCard || {}),
            ...(lib?.ok ? { similarity_notes: lib.similarity_notes } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (updErr) throw updErr;
      } catch {
        // If draft columns are missing, skip storing drafts (Review can still show pull quote + why).
      }

      drafted += 1;
    }

    // Internal follow: enrich a small batch of internal pending items the same way.
    let internalDrafted = 0;
    try {
      const { data: internalRows } = await supabaseAdmin
        .from('ao_quote_review_queue')
        .select('*')
        .eq('status', 'pending')
        .eq('is_internal', true)
        .is('best_move', null)
        .order('created_at', { ascending: false })
        .limit(5);

      for (const r of internalRows || []) {
        const decision = await analystDecision(r);

        const suggested_channels = ['linkedin', 'facebook', 'instagram', 'x'];
        const suggested_schedule = buildSuggestedSchedule(new Date());

        const autoDiscard = !!decision.auto_discarded || decision.best_move === 'discard';
        await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({
            suggested_channels,
            suggested_schedule,
            best_move: decision.best_move,
            objectives_by_channel: decision.objectives_by_channel,
            why_it_matters: decision.why_it_matters,
            content_kind: decision.content_kind,
            ao_lane: decision.ao_lane,
            topic_tags: decision.topic_tags,
            pull_quote: decision.pull_quote,
            risk_flags: decision.risk_flags,
            summary_interpretation: decision.summary_interpretation,
            alt_moves: decision.alt_moves,
            studio_playbook: decision.studio_playbook || null,
            auto_discarded: autoDiscard,
            discard_reason: autoDiscard ? decision.discard_reason || 'Auto-discarded' : null,
            quote_text: decision.pull_quote ? String(decision.pull_quote).slice(0, 500) : r.quote_text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.id);

        if (autoDiscard) {
          await supabaseAdmin
            .from('ao_quote_review_queue')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', r.id);
          continue;
        }

        const composed = await editorCompose(r, decision);
        if (!composed?.ok) continue;

        let quoteCard = null;
        if (decision.best_move === 'pull_quote_card' && decision.quote_card_worthy && decision.pull_quote) {
          const rendered = renderQuoteCardSvg({
            quote: decision.pull_quote,
            sourceName: r.source_name || r.source_title || 'Archetype Original',
            logoUrl: defaultLogoUrl,
            style: 'minimal',
            minimalVariant: 'dark',
          });
          if (rendered.ok) {
            quoteCard = {
              quote_card_template: rendered.template,
              quote_card_svg: rendered.svg,
              quote_card_caption: composed.drafts_by_channel?.instagram || null,
            };
            try {
              const up = await uploadMinimalQuoteCardToPublicUrl(
              { quote: decision.pull_quote, sourceName: r.source_name || r.source_title || '', logoUrl: defaultLogoUrl },
              { subfolder: 'review-queue-quote-cards' }
            );
              if (up.ok) quoteCard.quote_card_image_url = up.publicUrl;
            } catch (_) {}
          }
        }

        const lib = await librarianAnnotate({ candidateRow: r, decision });

        await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({
            drafts_by_channel: composed.drafts_by_channel,
            hashtags_by_channel: composed.hashtags_by_channel,
            first_comment_suggestions: composed.first_comment_suggestions,
            ...(quoteCard || {}),
            ...(lib?.ok ? { similarity_notes: lib.similarity_notes } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.id);

        internalDrafted += 1;
      }
    } catch (_) {
      // If internal items exist but columns are missing, skip quietly.
    }

    await supabaseAdmin
      .from('ao_scan_log')
      .update({
        finished_at: new Date().toISOString(),
        candidates_found: scan.candidatesFound ?? 0,
        candidates_inserted: scan.candidatesInserted ?? 0,
        error_message: null,
      })
      .eq('id', runLogId);

    return {
      ok: true,
      runLogId,
      externalCandidatesFound: scan.candidatesFound ?? 0,
      externalCandidatesInserted: scan.candidatesInserted ?? 0,
      draftedCount: drafted,
      internalDraftedCount: internalDrafted,
    };
  } catch (e) {
    if (runLogId) {
      try {
        await supabaseAdmin
          .from('ao_scan_log')
          .update({ finished_at: new Date().toISOString(), error_message: e.message })
          .eq('id', runLogId);
      } catch (_) {}
    }
    return { ok: false, error: e.message, runLogId };
  }
}

