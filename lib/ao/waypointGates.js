/**
 * Narrow waypoint gates for Auto (Phase 3).
 * Only two real gates: outline before first full journal draft, captions before publish.
 */

import {
  extractJournalSocialCaptionTexts,
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
  validateTwitterCaptionLength,
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
    // All channels present — still refuse if the X caption exceeds the real limit.
    const twitterText = extracted.found?.twitter;
    if (twitterText) {
      const tw = validateTwitterCaptionLength(twitterText);
      if (!tw.ok) {
        return {
          ok: false,
          missing: [],
          hasContentBlock: extracted.hasBlock,
          scheduledCount: rows.length,
          twitterOverLimit: true,
          twitterCount: tw.count,
          twitterLimit: tw.limit,
          error: tw.error,
        };
      }
    }
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

/**
 * Stub floor, not a style floor.
 *
 * These were 350/300/200 per channel. Measured against Bart's own 303 published
 * captions on 2026-08-21, every one of those numbers sat ABOVE the median for
 * its platform — linkedin median 260 against a 350 floor, instagram 257 against
 * 300, facebook 239 against 300, twitter 148 against 200. Since
 * handleScheduleCaptions treats this gate as a hard block, Auto could not
 * schedule captions written in Bart's actual voice: all four captions of a real
 * published set were rejected by it.
 *
 * Length is not evidence of quality — his best twitter copy is 151 characters.
 * What length can honestly catch is a stub: an empty or half-saved caption. 70
 * sits below the 10th percentile of every platform (linkedin 75, instagram 91,
 * facebook 91, twitter 109), so it flags genuine fragments without arguing with
 * how he writes.
 */
export const CAPTION_STUB_FLOOR = 70;

/** @deprecated Use CAPTION_STUB_FLOOR. Kept so existing imports keep resolving. */
export const CAPTION_MIN_LENGTH_BY_CHANNEL = {
  linkedin_personal: CAPTION_STUB_FLOOR,
  linkedin_business: CAPTION_STUB_FLOOR,
  facebook_business: CAPTION_STUB_FLOOR,
  facebook_personal: CAPTION_STUB_FLOOR,
  instagram_business: CAPTION_STUB_FLOOR,
  instagram_personal: CAPTION_STUB_FLOOR,
  twitter: CAPTION_STUB_FLOOR,
};

/**
 * Near-duplicate threshold for word-trigram Jaccard similarity between two
 * captions in the same set.
 *
 * Calibrated on real data rather than picked: across one of Bart's real
 * published sets the highest pairwise similarity was 0.382 — four captions that
 * legitimately share a quoted sentence but carry different commentary — while a
 * reconstruction of the "you are mailing it in" failure, one beat restated
 * across every channel, scored 0.780 to 1.000. 0.65 separates them with room on
 * both sides.
 */
export const CAPTION_NEAR_DUPLICATE_THRESHOLD = 0.65;

/** Strip URLs, hashtags, punctuation and case so comparison is about substance. */
function normalizeCaptionForComparison(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/#\w+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-trigram set. Trigrams, not words, so shared vocabulary alone does not read as duplication. */
function captionShingles(text, size = 3) {
  const tokens = normalizeCaptionForComparison(text).split(' ').filter(Boolean);
  const out = new Set();
  for (let i = 0; i + size <= tokens.length; i++) out.add(tokens.slice(i, i + size).join(' '));
  return out;
}

/** Jaccard similarity of two captions' trigram sets. 0 when either is too short to shingle. */
export function captionSimilarity(a, b) {
  const A = captionShingles(a);
  const B = captionShingles(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const s of A) if (B.has(s)) intersection++;
  return intersection / (A.size + B.size - intersection);
}

/**
 * Self-repetition floor: unique trigrams / total trigrams within one caption.
 *
 * Also calibrated rather than picked. All four captions of a real published set
 * score 1.000 — Bart does not repeat himself. Padding to clear a length floor
 * scores far lower: "Leadership matters." twenty times is 0.053, and one varied
 * sentence repeated six times is 0.174. 0.6 leaves a wide margin.
 *
 * This exists because a length floor invites padding, and padding is exactly
 * what a model reaches for when told a caption is too short.
 */
export const CAPTION_SELF_REPETITION_FLOOR = 0.6;

/** Below this many words a caption cannot meaningfully self-repeat, so the check is skipped. */
const SELF_REPETITION_MIN_WORDS = 12;

/** Unique-trigram ratio for one caption. 1 when it is too short to judge. */
export function captionSelfRepetitionRatio(text) {
  const tokens = normalizeCaptionForComparison(text).split(' ').filter(Boolean);
  if (tokens.length < SELF_REPETITION_MIN_WORDS) return 1;
  const all = [];
  const unique = new Set();
  for (let i = 0; i + 3 <= tokens.length; i++) {
    const gram = tokens.slice(i, i + 3).join(' ');
    all.push(gram);
    unique.add(gram);
  }
  if (!all.length) return 1;
  return unique.size / all.length;
}

const CTA_VERB_PATTERN =
  /\b(read|share|tell me|let me know|comment|reply|dm|follow|save this|tag someone|click|visit|check out|link in bio)\b/i;

/**
 * Structural caption quality gate (length floor + CTA heuristic).
 * @param {Record<string, string>} captionsByChannel
 * @returns {{ ok: boolean, failures: Array<{ channel: string, reasons: string[] }>, error?: string }}
 */
export function evaluateCaptionQualityGate(captionsByChannel) {
  const captions =
    captionsByChannel && typeof captionsByChannel === 'object' ? captionsByChannel : {};
  const failures = [];
  const warnings = [];

  const present = Object.entries(captions)
    .map(([channel, raw]) => [channel, String(raw || '').trim()])
    .filter(([, text]) => text);

  for (const [channel, text] of present) {
    const reasons = [];

    if (text.length < CAPTION_STUB_FLOOR) {
      reasons.push(`looks like a stub (${text.length} chars; under ${CAPTION_STUB_FLOOR})`);
    }

    const selfRepetition = captionSelfRepetitionRatio(text);
    if (selfRepetition < CAPTION_SELF_REPETITION_FLOOR) {
      reasons.push(
        `repeats itself (${Math.round(selfRepetition * 100)}% distinct phrasing) — ` +
          'this reads as padding, not copy'
      );
    }

    if (reasons.length) failures.push({ channel, reasons });

    // Advisory only. Bart's published captions carry a question 1% of the time
    // on Instagram and 19% at most anywhere; he ends on a declarative line, not
    // a prompt. Blocking on this rejected three of four captions in a real
    // published set, which is the guardrail arguing with the owner's voice.
    const finalThird = text.slice(Math.floor(text.length * (2 / 3)));
    const hasQuestion = finalThird.includes('?');
    const hasCta = CTA_VERB_PATTERN.test(finalThird) || CTA_VERB_PATTERN.test(text.slice(-180));
    if (!hasQuestion && !hasCta) {
      warnings.push({
        channel,
        reason: 'no question or CTA near the end — fine if deliberate, worth a look if not',
      });
    }
  }

  // The check this gate existed for and did not perform.
  //
  // The "you are mailing it in" pass restated one beat of the piece across most
  // of seven captions. Length and CTA both passed it cleanly; nothing here
  // compared the captions to each other. Per-channel copy should say the same
  // thing differently, not the same thing again.
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const [chA, textA] = present[i];
      const [chB, textB] = present[j];
      const similarity = captionSimilarity(textA, textB);
      if (similarity >= CAPTION_NEAR_DUPLICATE_THRESHOLD) {
        failures.push({
          channel: chA,
          reasons: [
            `near-duplicate of ${chB} (${Math.round(similarity * 100)}% overlap) — ` +
              'rewrite so each channel makes its own point',
          ],
        });
      }
    }
  }

  if (!failures.length) return { ok: true, failures: [], warnings };

  const detail = failures.map((f) => `${f.channel}: ${f.reasons.join('; ')}`).join(' | ');
  return {
    ok: false,
    failures,
    warnings,
    error: `Caption quality gate failed — rewrite before scheduling. ${detail}`,
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
