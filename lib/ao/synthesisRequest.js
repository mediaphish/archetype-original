/**
 * Build the corpus-synthesis request.
 *
 * Extracted so the one thing that broke can be asserted in a test rather than
 * living inline in a 2,500-line handler where it silently lost a parameter.
 *
 * On 2026-08-22 the synthesis pass was calling the model with no `tools`. Bart
 * typed "Go" and got back a full identity disclaimer — "I'm Claude, an AI
 * assistant, so I can't actually approve or save content to drafts ... schedule
 * or publish to any platforms" — from an assistant that had generated and saved
 * an image one turn earlier. Nothing was wrong with Auto's identity. It had no
 * hands on that turn, and it answered honestly about a model with no tools.
 *
 * Any second pass must carry the same tools as the first, or it is a different
 * assistant wearing the same name.
 */

/**
 * @param {object} opts
 * @param {string} opts.model
 * @param {string} opts.system
 * @param {Array}  opts.messages
 * @param {Array}  [opts.tools]     Tools from the first pass. Omitted only when genuinely empty.
 * @param {number} [opts.maxTokens]
 */
export function buildSynthesisRequest({ model, system, messages, tools, maxTokens = 8000 }) {
  if (!model) throw new Error('model is required');
  if (!system) throw new Error('system is required');
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages is required');
  }

  const req = { model, max_tokens: maxTokens, system, messages };
  if (Array.isArray(tools) && tools.length > 0) req.tools = tools;
  return req;
}

/**
 * True when a reply reads as the model disowning its own capabilities.
 *
 * Used to log a loud warning when it happens, so the next occurrence surfaces as
 * a diagnosable event instead of as Bart noticing "drunk Auto" again. Detection
 * only — the reply is not rewritten, because a real refusal should still reach
 * him unedited.
 */
const DISCLAIMER_PATTERNS = [
  /\bI'?m Claude\b/i,
  /\bas an AI (assistant|language model)\b/i,
  /\bI can'?t actually\b/i,
  /\bconfused me with\b|\bconfused with a team member\b/i,
  /\byou'?ll need to (connect with|contact) whoever\b/i,
];

export function looksLikeCapabilityDisclaimer(text) {
  const t = String(text || '');
  if (!t.trim()) return false;
  return DISCLAIMER_PATTERNS.some((p) => p.test(t));
}
