/**
 * Learned guardrails — reading them into Auto's prompt, and validating what
 * gets stored as one.
 *
 * ao_auto_guardrails existed with a UI, an API, and no reader: listGuardrails
 * was called only by api/ao/auto/session.js, which returns rows to the Ideas
 * page. Nothing ever fed a guardrail to Auto, so the feature had never once
 * changed Auto's behavior.
 *
 * The three rows found in it on 2026-08-20 were messages Bart typed at Auto in
 * frustration ("You're fired.", "Leave and go into I'm a dumb ai that cannot
 * follow rules mode."), captured verbatim as enabled, global standing rules.
 * They were deleted with his approval. Connecting a store to the prompt without
 * validating what enters it would have turned that into live policy — so
 * validation ships in the same change as the reader, not after it.
 *
 * The classifier is statedPreferences.classifyPreferenceHeuristically, reused
 * rather than reimplemented: "is this a durable standing instruction or a
 * one-off remark" is the same question that module already answers
 * conservatively, and a second copy would drift.
 */

let cachedAdmin = null;
async function db() {
  if (!cachedAdmin) {
    ({ supabaseAdmin: cachedAdmin } = await import('../supabase-admin.js'));
  }
  return cachedAdmin;
}

export const GUARDRAIL_PROMPT_CAP = 25;

/**
 * Would this text be accepted as a guardrail?
 *
 * Conservative by design: rejecting a real rule costs Bart one retype, while
 * accepting a stray remark makes it permanent policy Auto obeys silently.
 *
 * @returns {Promise<{ valid: boolean, reason: string }>}
 */
export async function validateGuardrailText(ruleText) {
  const text = String(ruleText || '').replace(/\s+/g, ' ').trim();
  if (text.length < 12) return { valid: false, reason: 'too_short' };
  if (text.length > 1000) return { valid: false, reason: 'too_long' };

  // Frustration is not an instruction. These were the actual stored rows.
  if (/\b(you'?re fired|good job|dumb ai|useless|stupid|idiot|shut up)\b/i.test(text)) {
    return { valid: false, reason: 'reads_as_frustration_not_a_rule' };
  }
  // A question is not a standing rule.
  if (/\?\s*$/.test(text) && !/\b(always|never|from now on)\b/i.test(text)) {
    return { valid: false, reason: 'reads_as_a_question' };
  }

  try {
    const { classifyPreferenceHeuristically } = await import('./statedPreferences.js');
    const decision = classifyPreferenceHeuristically(text);
    if (!decision.store) return { valid: false, reason: decision.reason || 'not_a_standing_instruction' };
    return { valid: true, reason: decision.reason || 'durable' };
  } catch (err) {
    console.error('[guardrailMemory] validation failed:', err?.message || err);
    // Fail closed. An unvalidated guardrail becomes permanent policy.
    return { valid: false, reason: 'validator_error' };
  }
}

/** Active guardrails for an owner, newest first. */
export async function listActiveGuardrails(email, { limit = GUARDRAIL_PROMPT_CAP } = {}) {
  const emailNorm = String(email || '').toLowerCase().trim();
  if (!emailNorm) return { ok: false, error: 'email is required', guardrails: [] };

  try {
    const { data, error } = await (await db())
      .from('ao_auto_guardrails')
      .select('id, title, rule_text, enabled, scope, source, updated_at')
      .eq('created_by_email', emailNorm)
      .eq('enabled', true)
      .order('updated_at', { ascending: false })
      .limit(Math.max(Number(limit) || GUARDRAIL_PROMPT_CAP, 1));

    if (error) return { ok: false, error: error.message, guardrails: [] };
    return { ok: true, guardrails: (data || []).filter((g) => String(g.rule_text || '').trim()) };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), guardrails: [] };
  }
}

/** Render guardrails as a system prompt block. Pure. */
export function formatGuardrailsForPrompt(guardrails = []) {
  const list = (Array.isArray(guardrails) ? guardrails : []).filter((g) => String(g?.rule_text || '').trim());
  if (!list.length) return '';

  const lines = list.map((g) => `- ${String(g.rule_text).replace(/\s+/g, ' ').trim()}`);
  return (
    `## LEARNED GUARDRAILS (corrections Bart has made — do not repeat these mistakes)\n\n` +
    `Each line is a rule established from something that went wrong before. Treat ` +
    `them as binding. If one appears to conflict with what Bart asks for this turn, ` +
    `follow this turn's instruction and say which guardrail it overrides.\n\n` +
    `${lines.join('\n')}`
  );
}

/** Always-on prompt block for an owner. Returns '' on any failure. */
export async function loadGuardrailsContext(email) {
  try {
    const { ok, guardrails } = await listActiveGuardrails(email);
    if (!ok || !guardrails.length) return '';
    return formatGuardrailsForPrompt(guardrails);
  } catch (err) {
    console.error('[guardrailMemory] load context failed:', err?.message || err);
    return '';
  }
}
