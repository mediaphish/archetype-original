/**
 * Auto hub — shared intent helpers, thread snapshot for prompts, transparency receipts.
 * Keeps routing logic testable without loading the full chat handler.
 */

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/** Remove phrases where digits mean day gaps, not card indices (publish / schedule flows). */
export function stripGapPhrasesForCardIndexParse(text) {
  let s = String(text || '');
  s = s.replace(/\b([1-9])\s+or\s+([1-9])\s+days?\b/gi, ' ');
  s = s.replace(/\bevery\s+([1-9]|[12][0-4])\s+days?\b/gi, ' ');
  s = s.replace(/\bevery\s+other\s+day\b/gi, ' ');
  s = s.replace(/\bnot\s+every\s+day\b/gi, ' ');
  s = s.replace(/\b\d+\s+days?\s+apart\b/gi, ' ');
  return s;
}

/**
 * User is adjusting spacing/timing of an existing publish plan (await_confirm), not picking new card numbers.
 */
export function wantsPublishScheduleTweak(userMessage) {
  const raw = String(userMessage || '').trim();
  if (!raw) return false;
  if (/\b(confirm\s+publish|yes\s*,?\s*schedule|proceed\s+with\s+publish)\b/i.test(raw)) return false;
  if (/^\s*(cancel|abort|stop)\s*\.?\s*$/i.test(raw)) return false;
  const s = raw.toLowerCase();
  return (
    /\b(tweak|adjust|change|respace|reschedule|spread|spacing|stagger|shift|push\s+out|space\s+out|less\s+frequent|wider\s+apart|longer\s+between)\b/.test(s) ||
    /\bnot\s+every\s+day\b/.test(s) ||
    /\bevery\s+other\s+day\b/.test(s) ||
    /\b[2-9]\s+or\s+[2-9]\s+days?\b/.test(s) ||
    /\bevery\s+[2-9]\s+days?\b/.test(s) ||
    /\bevery\s+1\s*[-–]?\s*3\s+days?\b/.test(s) ||
    /\bdays?\s+apart\b/.test(s) ||
    (/\bschedule\b/.test(s) && /\b(not|change|tweak|every|spacing|gap|day|days|often|frequent)\b/.test(s))
  );
}

/**
 * @returns {number|undefined} gap in days (1–14), or undefined to mean “caller default”
 */
export function parseGapDaysFromMessage(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (/\bevery\s+other\s+day\b/.test(s)) return 2;
  const orDays = s.match(/\b([2-9])\s+or\s+([2-9])\s+days?\b/);
  if (orDays) return Math.min(14, Math.max(1, Math.min(Number(orDays[1]), Number(orDays[2]))));
  const everyN = s.match(/\bevery\s+(\d{1,2})\s+days?\b/);
  if (everyN) return Math.min(14, Math.max(1, parseInt(everyN[1], 10)));
  if (/\bnot\s+every\s+day\b/.test(s)) return 2;
  if (/\bevery\s+third\s+day\b/.test(s) || /\bevery\s+3rd\s+day\b/.test(s)) return 3;
  if (/\bevery\s+second\s+day\b/.test(s) || /\bevery\s+2nd\s+day\b/.test(s)) return 2;
  const apart = s.match(/\b(\d{1,2})\s*[-–]?\s*(\d{1,2})?\s+days?\s+apart\b/);
  if (apart) return Math.min(14, Math.max(1, parseInt(apart[1], 10)));
  return undefined;
}

/** Compact, authoritative view of thread.state for the model (no SVG / huge blobs). */
export function buildThreadStateSnapshot(state) {
  if (!state || typeof state !== 'object') return {};
  const snap = {};
  if (state.quote_card_origin) snap.quote_card_origin = state.quote_card_origin;
  if (Array.isArray(state.corpus_pull_quotes)) {
    snap.corpus_pull_quotes_count = state.corpus_pull_quotes.length;
    snap.quote_previews = state.corpus_pull_quotes.slice(0, 20).map((q, i) => ({
      n: i + 1,
      preview: safeText(q.quote, 120),
    }));
  }
  if (Array.isArray(state.publish_candidates)) snap.publish_candidates_count = state.publish_candidates.length;
  if (state.publish_wizard?.step) {
    snap.publish_wizard_step = state.publish_wizard.step;
    const pend = state.publish_wizard.pending;
    if (pend?.items?.length) {
      snap.publish_pending_card_indices = pend.items.map((x) => x.corpus_index);
      snap.publish_pending_count = pend.items.length;
      if (pend.gap_days != null) snap.publish_gap_days = pend.gap_days;
    }
  }
  if (state.rapid_write?.active) {
    snap.rapid_write_active = true;
    const seeds = Array.isArray(state.rapid_write.seeds) ? state.rapid_write.seeds : [];
    const validation = Array.isArray(state.rapid_write.validation) ? state.rapid_write.validation : [];
    const overrideArr = Array.isArray(state.rapid_write.overrides) ? state.rapid_write.overrides : [];
    const overrideSet = new Set(overrideArr.map((x) => safeText(x, 80)));
    if (overrideArr.length) snap.rapid_write_overrides = overrideArr.map((x) => safeText(x, 80));
    const mem = state.rapid_write.memory && typeof state.rapid_write.memory === 'object' ? state.rapid_write.memory : null;
    if (mem?.last_action) snap.rapid_write_last_action = safeText(mem.last_action, 80);
    if (mem?.batch_intent && typeof mem.batch_intent === 'object') {
      snap.rapid_write_batch_intent = {
        kind: safeText(mem.batch_intent.kind, 40),
        seed_ids: Array.isArray(mem.batch_intent.seed_ids) ? mem.batch_intent.seed_ids.map((x) => safeText(x, 80)) : [],
        status: safeText(mem.batch_intent.status, 40),
      };
    }
    snap.rapid_write_seed_count = seeds.length;
    snap.rapid_write_seeds = seeds.map((s) => {
      const v = validation.find((x) => x.id === s.id);
      const flags = Array.isArray(v?.flags) ? v.flags : [];
      const flagged = flags.length > 0;
      const ownerApprovedDespiteFlags = overrideSet.has(s.id);
      return {
        id: safeText(s.id, 80),
        core_idea: safeText(s.core_idea, 260),
        leadership_category: safeText(s.leadership_category, 120),
        psychological_outcome: safeText(s.psychological_outcome, 120),
        insight_anchor: safeText(s.insight_anchor, 220),
        flagged,
        owner_approved_despite_flags: ownerApprovedDespiteFlags,
        effective_blocked_for_generation: flagged && !ownerApprovedDespiteFlags,
        flags: flags.map((f) => ({
          type: safeText(f.type, 40),
          detail: safeText(f.detail, 500),
        })),
      };
    });
    const written = Array.isArray(state.rapid_write.written_ids) ? state.rapid_write.written_ids : [];
    if (written.length) snap.rapid_write_written_ids = written;
    const draftsBy = state.rapid_write.drafts_by_seed_id;
    if (draftsBy && typeof draftsBy === 'object') {
      const keys = Object.keys(draftsBy);
      snap.rapid_write_draft_count = keys.length;
      const previewCap = 4000;
      snap.rapid_write_drafts = keys.map((kid) => {
        const d = draftsBy[kid];
        const md = safeText(d?.markdown, 50000);
        const truncated = md.length > previewCap;
        return {
          seed_id: safeText(kid, 80),
          title: safeText(d?.title, 200),
          preview: truncated ? `${md.slice(0, previewCap)}…` : md,
          truncated,
          has_corpus_row: !!d?.corpus_draft_id,
        };
      });
    }
  }
  if (Array.isArray(state.corpus_pull_quote_selection) && state.corpus_pull_quote_selection.length) {
    snap.corpus_pull_quote_selection = state.corpus_pull_quote_selection;
  }
  if (state.bundle_id) snap.active_bundle_id = state.bundle_id;
  if (state.bundle_title) snap.bundle_title = safeText(state.bundle_title, 120);
  if (state.pending_quality) snap.pending_quality_alarm = true;
  if (state.session_summary) snap.session_summary_tail = safeText(state.session_summary, 1200);
  return snap;
}

export function workflowHintFromState(state) {
  if (state?.rapid_write?.active) {
    const n = Array.isArray(state.rapid_write.seeds) ? state.rapid_write.seeds.length : 0;
    const dMap = state.rapid_write.drafts_by_seed_id;
    const dn = dMap && typeof dMap === 'object' ? Object.keys(dMap).length : 0;
    const draftLine =
      dn > 0
        ? ` ${dn} draft(s) are stored on this thread (rapid_write_drafts in snapshot)—Bart can ask to revise text by seed id in plain language; applied edits go through the revision path only.`
        : '';
    const ov = Array.isArray(state.rapid_write.overrides) ? state.rapid_write.overrides : [];
    const ovLine =
      ov.length > 0
        ? ` Owner has approved drafting for these seed ids despite flags: ${ov.join(', ')} — treat as authoritative; do not ask for "do it again" for those ids.`
        : '';
    return (
      `Rapid Write mode is on (${n} seed(s)).${draftLine}${ovLine} The thread snapshot lists each seed id, core idea, validation flags, overrides, and effective_blocked_for_generation. ` +
      `If Bart asks a question—strategy, what overlap means, whether to extend or merge with an existing corpus post, or which seeds to run—answer it directly in plain language. ` +
      `Do not reply with only a menu of commands. ` +
      `System-handled phrases when used clearly: Run all seeds, Next seed, do it anyway, Exit Rapid Write, Agent Training:.`
    );
  }
  if (!state?.publish_wizard || state.publish_wizard.step !== 'await_confirm') return '';
  const n = state.publish_wizard.pending?.items?.length || 0;
  const gap = state.publish_wizard.pending?.gap_days;
  return `A quote-card publish plan is waiting for confirmation (${n} cards${gap != null ? `, ${gap} day(s) between posts` : ''}). You can say CONFIRM PUBLISH, CANCEL, or ask to change spacing between posts without changing which cards.`;
}

export function pushTransparencyReceipt(receipts, label) {
  const line = safeText(label, 220);
  if (!line || !Array.isArray(receipts)) return;
  receipts.push(`Auto — ${line}`);
}

/**
 * Phase 1–2: wizard-first interpretation (must align with handler branch order).
 * Returns a stable key when the message should be handled as an in-wizard edit, not global parsing.
 */
export function getWizardFirstRouteKey(userMessage, state) {
  const raw = String(userMessage || '').trim();
  if (!raw) return null;
  const pw = state?.publish_wizard;
  if (pw?.step === 'await_confirm') {
    if (/\b(confirm\s+publish|yes\s*,?\s*schedule|proceed\s+with\s+publish)\b/i.test(raw)) return 'publish_confirm';
    if (/\b(cancel|abort|stop)\b/i.test(raw)) return 'publish_cancel';
    if (wantsPublishScheduleTweak(raw)) return 'publish_schedule_tweak';
  }
  return null;
}
