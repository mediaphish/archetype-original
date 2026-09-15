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
 * Did Bart's own message this turn approve something?
 *
 * The approval is his to give. Auto may record one only when his message says
 * so; a reply cannot approve on his behalf. Deliberately plain: it looks for the
 * words he uses ("approved", "looks good", "lock them in") and refuses when the
 * approval is negated or deferred ("don't approve yet", "not approved").
 */
export function bartApprovedInMessage(userMessage) {
  const text = String(userMessage || '').toLowerCase();
  if (!text.trim()) return false;
  if (/\b(?:don['’]?t|do not|not|never|hold off on|wait (?:to|before))\s+(?:yet\s+)?approv/.test(text)) return false;
  if (/\bnot\s+(?:yet\s+)?(?:approved|good|ready)\b/.test(text)) return false;
  return /\b(?:approve[ds]?|approving|approval|looks? good|good to go|lock (?:it|them|these|those) in|go ahead|ship it|perfect|love (?:it|them|these|those))\b/.test(
    text
  );
}
