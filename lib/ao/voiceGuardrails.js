/**
 * voiceGuardrails.js
 *
 * Code-level enforcement of Bart's voice / anti-AI-signature rules.
 * Soft instructions in system prompts were not holding under generation pressure —
 * same failure mode that led to enforceResponseRules.js. Moving the list here makes
 * it guaranteed on finalized text (saved thread messages, captions, drafts).
 *
 * Flow:
 * 1. detectVoiceViolations(text) — pure scan
 * 2. enforceVoiceGuardrails(text) — self-correct via a cheap rewrite pass (up to 2x),
 *    then forced literal strip as last resort. Never throws; on API failure returns
 *    the original text unmodified.
 *
 * Streaming note: main chat still streams tokens live before this runs (same pattern
 * as enforceResponseRules). Violations may flicker in the stream; they must not survive
 * into what is persisted or published.
 *
 * VOICE_VIOLATIONS is meant to be edited directly as new tics are noticed — same spirit
 * as KNOWN_REAL_SIGNALS in enforceResponseRules.js.
 */

/** @typedef {{ id: string, label: string, pattern: RegExp, kind: 'phrase' | 'structural', soft?: boolean }} VoiceViolationDef */
/** @typedef {{ id: string, label: string, matchedText: string, index: number, soft?: boolean }} VoiceViolationHit */

/**
 * Edit this list when Bart catches a new AI signature tic.
 * `soft: true` = still rewrite, but do NOT hard-strip on forced-fallback
 * (used for words that are sometimes literal, e.g. travel "journey").
 *
 * @type {VoiceViolationDef[]}
 */
export const VOICE_VIOLATIONS = [
  // --- Sitting / pausing family (the tic that triggered this fix) ---
  { id: 'worth-sitting-with', label: 'worth sitting with', pattern: /\bworth\s+sitting\s+with\b/gi, kind: 'phrase' },
  { id: 'worth-sitting-in', label: 'worth sitting in', pattern: /\bworth\s+sitting\s+in\b/gi, kind: 'phrase' },
  { id: 'worth-sitting-on', label: 'worth sitting on', pattern: /\bworth\s+sitting\s+on\b/gi, kind: 'phrase' },
  { id: 'sit-with-that', label: 'sit with that', pattern: /\bsit\s+with\s+that(?:\s+for\s+a\s+moment)?\b/gi, kind: 'phrase' },
  { id: 'hold-space-for', label: 'hold(s) space for', pattern: /\bholds?\s+space\s+for\b/gi, kind: 'phrase' },

  // --- Hedge / announce phrases ---
  { id: 'worth-noting', label: "it's worth noting", pattern: /\bit'?s\s+worth\s+noting\b/gi, kind: 'phrase' },
  { id: 'important-to-note', label: "it's important to note", pattern: /\bit'?s\s+important\s+to\s+note\b/gi, kind: 'phrase' },
  { id: 'important-to-remember', label: "it's important to remember", pattern: /\bit'?s\s+important\s+to\s+remember\b/gi, kind: 'phrase' },
  { id: 'at-its-core', label: 'at its core', pattern: /\bat\s+its\s+core\b/gi, kind: 'phrase' },
  { id: 'in-many-ways', label: 'in many ways', pattern: /\bin\s+many\s+ways\b/gi, kind: 'phrase' },
  { id: 'in-essence', label: 'in essence', pattern: /\bin\s+essence\b/gi, kind: 'phrase' },
  { id: 'cannot-be-overstated', label: 'cannot be overstated', pattern: /\bcannot\s+be\s+overstated\b/gi, kind: 'phrase' },
  { id: 'speaks-to', label: 'speaks to the/a', pattern: /\bspeaks\s+to\s+(?:the|a)\b/gi, kind: 'phrase' },
  { id: 'shed-light-on', label: 'shed light on', pattern: /\bshed\s+light\s+on\b/gi, kind: 'phrase' },

  // --- Transition clichés ---
  { id: 'furthermore', label: 'furthermore', pattern: /\bfurthermore\b/gi, kind: 'phrase' },
  { id: 'moreover', label: 'moreover', pattern: /\bmoreover\b/gi, kind: 'phrase' },
  { id: 'when-it-comes-to', label: 'when it comes to', pattern: /\bwhen\s+it\s+comes\s+to\b/gi, kind: 'phrase' },
  { id: 'at-the-end-of-the-day', label: 'at the end of the day', pattern: /\bat\s+the\s+end\s+of\s+the\s+day\b/gi, kind: 'phrase' },
  { id: 'in-conclusion', label: 'in conclusion', pattern: /\bin\s+conclusion\b/gi, kind: 'phrase' },
  { id: 'in-a-world-where', label: 'in a world where', pattern: /\bin\s+a\s+world\s+where\b/gi, kind: 'phrase' },

  // --- Vague-depth / filler ---
  { id: 'delve', label: 'delve (into)', pattern: /\bdelve(?:\s+into)?\b/gi, kind: 'phrase' },
  { id: 'tapestry', label: '(rich) tapestry', pattern: /\b(?:rich\s+)?tapestry\b/gi, kind: 'phrase' },
  { id: 'navigate', label: 'navigate', pattern: /\bnavigate\b/gi, kind: 'phrase' },
  { id: 'resonate', label: 'resonate/resonates/resonating', pattern: /\bresonat(?:e|es|ing)\b/gi, kind: 'phrase' },
  { id: 'underscores', label: 'underscores (the importance of)', pattern: /\bunderscores?(?:\s+the\s+importance\s+of)?\b/gi, kind: 'phrase' },
  { id: 'testament-to', label: 'testament to', pattern: /\btestament\s+to\b/gi, kind: 'phrase' },
  { id: 'nuanced', label: 'nuanced', pattern: /\bnuanced\b/gi, kind: 'phrase' },
  { id: 'multifaceted', label: 'multifaceted', pattern: /\bmultifaceted\b/gi, kind: 'phrase' },
  { id: 'boasts', label: 'boast(s)', pattern: /\bboasts?\b/gi, kind: 'phrase' },
  { id: 'seamlessly', label: 'seamlessly', pattern: /\bseamlessly\b/gi, kind: 'phrase' },
  { id: 'robust', label: 'robust', pattern: /\brobust\b/gi, kind: 'phrase' },
  { id: 'unpack', label: 'unpack(ing)', pattern: /\bunpack(?:ing)?\b/gi, kind: 'phrase' },
  // Soft: often literal travel / literal terrain — rewrite when metaphorical, never forced-strip
  { id: 'journey', label: 'journey (metaphor)', pattern: /\bjourney\b/gi, kind: 'phrase', soft: true },
  { id: 'landscape', label: 'landscape (metaphor)', pattern: /\blandscape\b/gi, kind: 'phrase', soft: true },

  // --- Corporate / marketing-speak ---
  { id: 'unlock', label: 'unlock(s|ing)', pattern: /\bunlock(?:s|ing)?\b/gi, kind: 'phrase' },
  { id: 'unleash', label: 'unleash(es|ing)', pattern: /\bunleash(?:es|ing)?\b/gi, kind: 'phrase' },
  { id: 'elevate', label: 'elevate(s|ing)', pattern: /\belevate(?:s|ing)?\b/gi, kind: 'phrase' },
  { id: 'leverage-verb', label: 'leverage (verb)', pattern: /\bleverag(?:e|es|ed|ing)\b/gi, kind: 'phrase' },
  { id: 'game-changer', label: 'game-changer', pattern: /\bgame[- ]changer\b/gi, kind: 'phrase' },
  { id: 'paradigm-shift', label: 'paradigm shift', pattern: /\bparadigm\s+shift\b/gi, kind: 'phrase' },
  { id: 'in-todays-world', label: "in today's (fast-paced) world", pattern: /\bin\s+today'?s\s+(?:fast-paced\s+)?world\b/gi, kind: 'phrase' },

  // --- Structural patterns ---
  { id: 'not-only-but-also', label: 'not only X but also Y', pattern: /\bnot\s+only\b[\s\S]{0,60}\bbut\s+also\b/gi, kind: 'structural' },
  { id: 'not-just-its', label: "not just X, it's Y", pattern: /\bnot\s+just\b[\s\S]{0,40}\bit'?s\b/gi, kind: 'structural' },
  { id: 'its-not-its', label: "it's not X, it's Y", pattern: /\bit'?s\s+not\b[\s\S]{0,40}\b(?:it'?s|about)\b/gi, kind: 'structural' },
  // Em dash — already a prompt rule ("No em dashes. Ever."); enforce in code too.
  { id: 'em-dash', label: 'em dash (—)', pattern: /—/g, kind: 'structural' },
];

/**
 * @param {string} text
 * @returns {VoiceViolationHit[]}
 */
export function detectVoiceViolations(text) {
  const input = String(text || '');
  if (!input) return [];

  /** @type {VoiceViolationHit[]} */
  const hits = [];

  for (const def of VOICE_VIOLATIONS) {
    // Fresh lastIndex each scan — patterns are global.
    def.pattern.lastIndex = 0;
    let match;
    while ((match = def.pattern.exec(input)) !== null) {
      hits.push({
        id: def.id,
        label: def.label,
        matchedText: match[0],
        index: match.index,
        soft: !!def.soft,
      });
      // Avoid zero-length infinite loops
      if (match[0].length === 0) def.pattern.lastIndex += 1;
    }
  }

  hits.sort((a, b) => a.index - b.index);
  return hits;
}

function formatViolationList(violations) {
  return violations
    .map((v) => `- ${v.label}: "${v.matchedText.replace(/\s+/g, ' ').trim()}"`)
    .join('\n');
}

/**
 * Last-resort: remove hard (non-soft) matched substrings. Soft hits are left alone.
 * @param {string} text
 * @param {VoiceViolationHit[]} violations
 */
function forceStripViolations(text, violations) {
  let out = String(text || '');
  const hard = violations.filter((v) => !v.soft);
  // Strip longer matches first so nested overlaps behave better
  const unique = [...hard].sort((a, b) => b.matchedText.length - a.matchedText.length);
  const seen = new Set();
  for (const v of unique) {
    const key = v.matchedText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Escape for literal replace-all
    const escaped = v.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'gi'), '');
  }
  // Collapse leftover double spaces from phrase strips (not newlines)
  out = out.replace(/[^\S\n]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
  return out;
}

async function rewriteOnce(anthropicClient, text, violations, attemptLabel) {
  const model =
    process.env.AUTO_VOICE_CORRECTION_MODEL ||
    process.env.AUTO_ANTHROPIC_MODEL ||
    'claude-haiku-4-5-20251001';

  const system = `You wrote a response that used flagged phrases/patterns:
${formatViolationList(violations)}

Rewrite the text below to remove ONLY those, preserving all other meaning, structure, formatting, and voice exactly. Do not shorten it, do not add commentary, do not explain what you changed. Return ONLY the corrected text.`;

  const response = await anthropicClient.messages.create({
    model,
    max_tokens: Math.min(8000, Math.max(1000, Math.ceil(String(text).length / 2) + 500)),
    system,
    messages: [{ role: 'user', content: String(text) }],
  });

  const corrected = (response.content?.[0]?.text || '').trim();
  if (!corrected) {
    throw new Error(`Voice correction returned empty text (${attemptLabel})`);
  }
  // The correction prompt explicitly instructs "do not shorten it," but nothing enforced
  // that -- confirmed live: a correction pass can come back substantially shorter than the
  // original, and with no check here, that shortened text silently became the final reply,
  // replacing what Bart was already reading on screen with something visibly different.
  // A real edit that only removes a few flagged words should barely change length; a drop
  // this large means the model rewrote instead of edited, which this function must treat
  // as a failed attempt, not a success.
  const lengthRatio = corrected.length / Math.max(1, String(text).length);
  if (lengthRatio < 0.75) {
    throw new Error(
      `Voice correction dropped too much content (${attemptLabel}): ${String(text).length} chars -> ${corrected.length} chars (${Math.round(lengthRatio * 100)}%)`
    );
  }
  return corrected;
}

/**
 * Self-correct Auto-generated text against VOICE_VIOLATIONS.
 * Never throws. On API failure, returns the original text unmodified.
 *
 * @param {string} text
 * @param {{ anthropicClient?: import('@anthropic-ai/sdk').default, contextLabel?: string }} [options]
 */
export async function enforceVoiceGuardrails(
  text,
  { anthropicClient = null, contextLabel = 'response' } = {}
) {
  const original = String(text ?? '');
  try {
    let violations = detectVoiceViolations(original);
    if (violations.length === 0) {
      return { text: original, corrected: false, forced: false, violations: [] };
    }

    if (!anthropicClient) {
      console.warn(
        `[voiceGuardrails] Violations found in ${contextLabel} but no anthropicClient — returning original (${violations.length} hit(s))`
      );
      return { text: original, corrected: false, forced: false, violations };
    }

    let current = original;
    const originalViolations = violations;

    // Pass 1
    try {
      current = await rewriteOnce(anthropicClient, current, violations, 'pass-1');
    } catch (err) {
      console.warn(
        `[voiceGuardrails] Correction API failed (${contextLabel}); returning original:`,
        err?.message || err
      );
      return { text: original, corrected: false, forced: false, violations: originalViolations };
    }

    violations = detectVoiceViolations(current);
    if (violations.length === 0) {
      return { text: current, corrected: true, forced: false, violations: originalViolations };
    }

    // Pass 2 — name remaining violations explicitly
    try {
      current = await rewriteOnce(anthropicClient, current, violations, 'pass-2');
    } catch (err) {
      console.warn(
        `[voiceGuardrails] Second correction API failed (${contextLabel}); forced strip:`,
        err?.message || err
      );
      const stripped = forceStripViolations(current, violations);
      console.warn(
        `[voiceGuardrails] FORCED STRIP after correction API failure (${contextLabel}):`,
        violations.map((v) => v.id).join(', ')
      );
      return { text: stripped, corrected: true, forced: true, violations: originalViolations };
    }

    violations = detectVoiceViolations(current);
    if (violations.length === 0) {
      return { text: current, corrected: true, forced: false, violations: originalViolations };
    }

    // Last resort
    const stripped = forceStripViolations(current, violations);
    console.warn(
      `[voiceGuardrails] FORCED STRIP after 2 failed self-correction attempts (${contextLabel}):`,
      violations.map((v) => `${v.id}:"${v.matchedText}"`).join('; ')
    );
    return { text: stripped, corrected: true, forced: true, violations: originalViolations };
  } catch (err) {
    console.warn(
      `[voiceGuardrails] Unexpected error (${contextLabel}); returning original:`,
      err?.message || err
    );
    return { text: original, corrected: false, forced: false, violations: [] };
  }
}

/**
 * Walk a JSON-ish value and run enforceVoiceGuardrails on every string leaf.
 * Used for caption maps / derivation plans so JSON structure stays intact.
 *
 * @param {unknown} value
 * @param {{ anthropicClient?: import('@anthropic-ai/sdk').default, contextLabel?: string }} [options]
 */
export async function enforceVoiceGuardrailsDeep(value, options = {}) {
  if (typeof value === 'string') {
    const result = await enforceVoiceGuardrails(value, options);
    return { value: result.text, anyCorrected: result.corrected, violations: result.violations };
  }
  if (Array.isArray(value)) {
    let anyCorrected = false;
    const allViolations = [];
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const r = await enforceVoiceGuardrailsDeep(value[i], {
        ...options,
        contextLabel: `${options.contextLabel || 'deep'}[${i}]`,
      });
      out.push(r.value);
      if (r.anyCorrected) anyCorrected = true;
      allViolations.push(...(r.violations || []));
    }
    return { value: out, anyCorrected, violations: allViolations };
  }
  if (value && typeof value === 'object') {
    let anyCorrected = false;
    const allViolations = [];
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const r = await enforceVoiceGuardrailsDeep(v, {
        ...options,
        contextLabel: `${options.contextLabel || 'deep'}.${k}`,
      });
      out[k] = r.value;
      if (r.anyCorrected) anyCorrected = true;
      allViolations.push(...(r.violations || []));
    }
    return { value: out, anyCorrected, violations: allViolations };
  }
  return { value, anyCorrected: false, violations: [] };
}
