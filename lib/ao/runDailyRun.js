import { supabaseAdmin } from '../supabase-admin.js';
import { runExternalScan } from './runExternalScan.js';
import { draftQuotePost } from './draftQuotePost.js';

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
 * Daily run: external scan + drafts + suggested schedule.
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

    const scan = await runExternalScan({ insertedCap: 20, candidatesCap: 120, sourcesLimit: 25, entriesPerSource: 10 });
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
      .select('id,quote_text,source_slug_or_url,source_type,is_internal,created_at,suggested_schedule')
      .eq('status', 'pending')
      .eq('is_internal', false)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20);
    if (quotesErr) {
      await supabaseAdmin
        .from('ao_scan_log')
        .update({ finished_at: new Date().toISOString(), error_message: quotesErr.message })
        .eq('id', runLogId);
      return { ok: false, error: quotesErr.message, runLogId };
    }

    const toDraft = (recentQuotes || []).filter((q) => !q.suggested_schedule).slice(0, 10);
    let drafted = 0;
    for (const q of toDraft) {
      const draftedOut = await draftQuotePost(q);
      const suggested_channels = ['linkedin', 'facebook', 'instagram', 'x'];
      const suggested_schedule = buildSuggestedSchedule(new Date());
      try {
        const { error: updErr } = await supabaseAdmin
          .from('ao_quote_review_queue')
          .update({
            suggested_channels,
            suggested_schedule,
            drafts_by_channel: draftedOut.ok ? draftedOut.drafts_by_channel : null,
            hashtags_by_channel: draftedOut.ok ? draftedOut.hashtags_by_channel : null,
            first_comment_suggestions: draftedOut.ok ? draftedOut.first_comment_suggestions : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', q.id);
        if (updErr) throw updErr;
      } catch (e2) {
        const msg = String(e2?.message || e2 || '');
        const missingColumns =
          msg.includes('drafts_by_channel') ||
          msg.includes('hashtags_by_channel') ||
          msg.includes('first_comment_suggestions');
        if (missingColumns) {
          await supabaseAdmin
            .from('ao_quote_review_queue')
            .update({
              suggested_channels,
              suggested_schedule,
              updated_at: new Date().toISOString(),
            })
            .eq('id', q.id);
        } else {
          throw e2;
        }
      }
      drafted += 1;
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

