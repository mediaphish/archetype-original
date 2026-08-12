/**
 * Narrow waypoint gates for Auto (Phase 3).
 * Only two real gates: outline before first full journal draft, captions before publish.
 */

import {
  extractJournalSocialCaptionTexts,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
} from './parseJournalSocialCaptions.js';

export const FULL_DRAFT_CONTENT_THRESHOLD = 800;

/**
 * @param {string} content
 * @returns {boolean}
 */
export function isFullLengthDraftContent(content) {
  return String(content || '').trim().length > FULL_DRAFT_CONTENT_THRESHOLD;
}

/**
 * Read brief metadata from a draft row.
 * @param {object|null} draft
 */
export function getBriefMeta(draft) {
  const meta = draft?.metadata && typeof draft.metadata === 'object' ? draft.metadata : {};
  const brief = meta.brief && typeof meta.brief === 'object' ? meta.brief : {};
  return {
    outline_text: brief.outline_text ? String(brief.outline_text) : null,
    outline_presented_at: brief.outline_presented_at || null,
    outline_approved_at: brief.outline_approved_at || null,
    outline_skipped_at: brief.outline_skipped_at || null,
    outline_skip_reason: brief.outline_skip_reason || null,
  };
}

/**
 * Decide whether a save_draft of long journal content may proceed.
 *
 * Brand-new / outline-stub first full writes need outline_approved_at or an
 * explicit skip. Editing an already-long draft is untouched.
 *
 * @returns {{ allowed: boolean, error?: string, gate?: string, brief?: object }}
 */
export function evaluateOutlineSaveGate({
  kind,
  content,
  existing = null,
  skipOutline = false,
} = {}) {
  if (String(kind || '').trim() !== 'journal') {
    return { allowed: true };
  }
  if (!isFullLengthDraftContent(content)) {
    return { allowed: true };
  }

  const brief = getBriefMeta(existing);
  if (brief.outline_approved_at || brief.outline_skipped_at) {
    return { allowed: true, brief };
  }
  if (skipOutline) {
    return { allowed: true, brief, skipped: true };
  }

  const existingLen = String(existing?.content || '').trim().length;
  // Established long draft being edited — do not re-gate.
  if (existing && existingLen > FULL_DRAFT_CONTENT_THRESHOLD) {
    return { allowed: true, brief };
  }

  // Brand-new row OR outline stub without approval.
  return {
    allowed: false,
    gate: 'outline_required',
    brief,
    error:
      "Let's lock the outline first — present a short plan with present_outline, " +
      'get Bart\'s yes (or an explicit "skip the outline, just write it"), then save the full piece.',
  };
}

/**
 * Conservative classifier for Bart's reply after an outline was presented.
 * @returns {'approve'|'skip'|'neither'}
 */
export function classifyOutlineReply(userMessage) {
  const text = String(userMessage || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'neither';

  if (
    /\bskip(?:\s+the)?\s+outline\b/i.test(text) ||
    /\bjust\s+write\s+it\b/i.test(text) ||
    /\bno\s+outline\b/i.test(text) ||
    /\bwrite\s+the\s+full\s+(?:post|piece|draft)\b/i.test(text)
  ) {
    return 'skip';
  }

  // Affirmative — keep narrow (same conservatism as preference capture).
  if (
    /^(?:yes|yep|yeah|approved?|looks\s+good|go\s+ahead|lock\s+it|that\s+works|proceed|ok|okay|do\s+it)(?:[.!]|$)/i.test(
      text
    ) ||
    /\b(?:approve|approved|lock)\s+(?:the\s+)?outline\b/i.test(text) ||
    /\boutline\s+(?:looks\s+good|approved|locked)\b/i.test(text)
  ) {
    return 'approve';
  }

  return 'neither';
}

/**
 * Channels still missing for a publish (from draft body and/or already-scheduled rows).
 * @param {{ content?: string, slug?: string }} draft
 * @param {Array<{ platform?: string, account_id?: string, status?: string }>|null} scheduledRows
 * @returns {{ ok: boolean, missing: string[], hasContentBlock: boolean, scheduledCount: number, error?: string }}
 */
export function evaluatePublishCaptionsGate(draft, scheduledRows = null) {
  const extracted = extractJournalSocialCaptionTexts(draft?.content || '');
  const covered = new Set();

  if (extracted.hasBlock) {
    for (const key of Object.keys(extracted.found || {})) {
      covered.add(key);
    }
  }

  const rows = Array.isArray(scheduledRows) ? scheduledRows : [];
  for (const row of rows) {
    const status = String(row?.status || '').toLowerCase();
    if (status === 'failed' || status === 'cancelled') continue;
    const match = JOURNAL_LAUNCH_REQUIRED_CHANNELS.find(
      (ch) =>
        ch.platform === String(row?.platform || '').toLowerCase() &&
        ch.account_id === String(row?.account_id || '').toLowerCase()
    );
    if (match) covered.add(match.key);
  }

  const missing = JOURNAL_LAUNCH_REQUIRED_CHANNELS.map((ch) => ch.key).filter(
    (k) => !covered.has(k)
  );

  if (missing.length === 0) {
    return {
      ok: true,
      missing: [],
      hasContentBlock: extracted.hasBlock,
      scheduledCount: rows.length,
    };
  }

  return {
    ok: false,
    missing,
    hasContentBlock: extracted.hasBlock,
    scheduledCount: rows.length,
    error:
      `This draft doesn't have captions for all required channels yet (missing: ${missing.join(
        ', '
      )}) — get those set before I publish.`,
  };
}

/** Build a minimal SOCIAL_CAPTIONS block covering every required channel (tests). */
export function buildCompleteCaptionsBlockForTest(bodyPrefix = 'Caption') {
  const parts = JOURNAL_LAUNCH_REQUIRED_CHANNELS.map(
    (ch) => `[CAPTION platform="${ch.key}"]\n${bodyPrefix} for ${ch.key}\n[/CAPTION]`
  );
  return `[SOCIAL_CAPTIONS]\n${parts.join('\n')}\n[/SOCIAL_CAPTIONS]`;
}

/**
 * Mark the most recent pending outline as approved or skipped from Bart's chat reply.
 */
export async function maybeResolveOutlineFromUserMessage({ email, userMessage } = {}) {
  const decision = classifyOutlineReply(userMessage);
  if (decision === 'neither') return { ok: true, updated: false, decision };

  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!emailNorm) return { ok: false, updated: false, error: 'email required' };

  const { contentDrafts } = await import('../db/contentDrafts.js');
  const { data, error } = await contentDrafts()
    .select('id, slug, metadata, updated_at')
    .eq('created_by_email', emailNorm)
    .eq('kind', 'journal')
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(15);

  if (error) return { ok: false, updated: false, error: error.message };

  const pending = (data || []).find((row) => {
    const brief = getBriefMeta(row);
    return brief.outline_presented_at && !brief.outline_approved_at && !brief.outline_skipped_at;
  });
  if (!pending) return { ok: true, updated: false, decision, reason: 'no_pending_outline' };

  const priorBrief = getBriefMeta(pending);
  const briefUpdate =
    decision === 'approve'
      ? {
          outline_text: priorBrief.outline_text,
          outline_presented_at: priorBrief.outline_presented_at,
          outline_approved_at: new Date().toISOString(),
          outline_skipped_at: null,
          outline_skip_reason: null,
        }
      : {
          outline_text: priorBrief.outline_text,
          outline_presented_at: priorBrief.outline_presented_at,
          outline_approved_at: null,
          outline_skipped_at: new Date().toISOString(),
          outline_skip_reason: 'explicit_skip_in_chat',
        };

  const priorMeta =
    pending.metadata && typeof pending.metadata === 'object' ? pending.metadata : {};
  const { error: updErr } = await contentDrafts()
    .update({
      metadata: { ...priorMeta, brief: briefUpdate },
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id)
    .eq('created_by_email', emailNorm);

  if (updErr) return { ok: false, updated: false, error: updErr.message };

  if (decision === 'skip') {
    console.warn('[waypointGates] outline skipped via chat for slug=', pending.slug);
  }

  return {
    ok: true,
    updated: true,
    decision,
    slug: pending.slug,
    id: pending.id,
  };
}
