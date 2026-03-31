import { supabaseAdmin } from '../supabase-admin.js';
import { prepareQuoteBrief } from './prepareQuoteBrief.js';

function needsBrief(row) {
  return !(row?.why_it_matters && row?.summary_interpretation && row?.ao_lane && row?.best_move);
}

export async function runBriefPrep({ limit = 12, cooldownMs = 5 * 60 * 1000, removeAfterAttempts = 3 } = {}) {
  const now = Date.now();
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(50, Number(limit || 12))));

    if (error) return { ok: false, error: error.message };

    const rows = Array.isArray(data) ? data : [];
    const candidates = rows
      .filter((row) => row && needsBrief(row))
      .filter((row) => {
        const last = row?.brief_last_attempt_at ? new Date(row.brief_last_attempt_at).getTime() : 0;
        if (!last || Number.isNaN(last)) return true;
        return (now - last) > cooldownMs;
      });

    let attempted = 0;
    let ready = 0;
    let removed = 0;
    let notReady = 0;

    for (const row of candidates) {
      const result = await prepareQuoteBrief({
        row,
        email: row.created_by_email,
        bumpAttempt: true,
        removeAfterAttempts,
      });
      attempted += 1;
      if (!result.ok) continue;
      if (result.removed) removed += 1;
      else if (result.not_ready) notReady += 1;
      else ready += 1;
    }

    return {
      ok: true,
      scanned: rows.length,
      attempted,
      ready,
      not_ready: notReady,
      removed,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
