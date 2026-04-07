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
