/**
 * Pure rules for recording a stage approval, kept apart from stageApproval.js so
 * they can be tested without a database client.
 */
import { buildCaptionsPanel } from './journalPanelData.js';

export const APPROVABLE_STAGES = new Set(['image', 'captions']);
const CHANNEL_KEYS = new Set(buildCaptionsPanel({}).map((c) => c.key));

/** Only real channel keys with non-empty text. */
export function cleanCaptions(incoming) {
  const out = {};
  if (!incoming || typeof incoming !== 'object') return out;
  for (const [key, text] of Object.entries(incoming)) {
    const t = String(text || '').trim();
    if (CHANNEL_KEYS.has(key) && t) out[key] = t;
  }
  return out;
}

/**
 * Asking for the next step approves the one before it.
 *
 * 2026-09-20: Bart uploaded the header image himself, then said "Now give me
 * captions." Auto refused to move, demanded the words "I approve the image",
 * and kept asking after he said "The image is approved. Be smarter." He was
 * right: "I gave you the image. You are actively refusing to accept it as an
 * approved image. And I asked for captions, which should also suggest image
 * approval. I built you to be intelligent."
 */
const NEXT_STEP_REQUEST = {
  image: /\b(?:captions?|schedule|publish|post it|move on|next step|what['’]?s next)\b/,
  captions: /\b(?:schedule|publish|post (?:it|them)|queue (?:it|them)|move on|next step|what['’]?s next)\b/,
};

/** Plain approval, in the words Bart actually uses. */
const APPROVAL =
  /\b(?:approve[ds]?|approving|approval|looks? good|good to go|lock (?:it|them|these|those) in|go ahead|ship it|perfect|love (?:it|them|these|those)|use (?:it|that|this one)|that['’]?s the one)\b/;

/** He is holding off, not approving. */
function deferredOrNegated(text) {
  if (/\b(?:don['’]?t|do not|never|hold off on|wait (?:to|before))\s+(?:yet\s+)?approv/.test(text)) return true;
  if (/\bnot\s+(?:yet\s+)?(?:approved|approving|good|ready)\b/.test(text)) return true;
  if (/\b(?:hold off|not yet|wait)\b/.test(text) && !APPROVAL.test(text)) return true;
  return false;
}

/**
 * Did Bart's own message this turn approve this step?
 *
 * The approval is his to give, and a reply can never approve on his behalf. But
 * approval does not have to be the word: giving the work the next instruction is
 * approval of the step it follows, and so is handing over the artifact himself.
 *
 * @param {string} userMessage
 * @param {{ stage?: string, suppliedByBart?: boolean }} context
 */
export function bartApprovedInMessage(userMessage, { stage = null, suppliedByBart = false } = {}) {
  const text = String(userMessage || '').toLowerCase();
  if (deferredOrNegated(text)) return false;

  // Bart made the thing himself: uploading his own header image is approving it.
  if (suppliedByBart) return true;

  if (!text.trim()) return false;
  if (APPROVAL.test(text)) return true;

  const next = stage ? NEXT_STEP_REQUEST[String(stage)] : null;
  return next ? next.test(text) : false;
}
