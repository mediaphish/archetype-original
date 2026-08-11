/**
 * gateActionClaims.js
 *
 * Blocks Auto from telling Bart an action already happened unless this same turn
 * has a successful tool result (or a legacy bracket signal that still performs
 * that action). Prefer regenerating with an explicit correction note over
 * silently rewriting the model’s words.
 */

/**
 * @typedef {{ id: string, label: string, tools: string[], legacySignalTests: RegExp[], claimPatterns: RegExp[] }} ActionClaimRule
 */

/** @type {ActionClaimRule[]} */
export const ACTION_CLAIM_RULES = [
  {
    id: 'save_or_rebuild',
    label: 'save/rebuild draft',
    tools: ['save_draft'],
    legacySignalTests: [/\[JOURNAL_CONTENT\]/i, /\[DEVOTIONAL_CONTENT\]/i],
    claimPatterns: [
      /\bsaved(?:\s+as\s+(?:a\s+)?draft)?\b/i,
      /\bdraft\s+(?:has\s+been\s+|is\s+|was\s+)?saved\b/i,
      /\bi(?:['’]ve| have)\s+(?:now\s+)?saved\b/i,
      /\brebuilt\b/i,
      /\brebuilding\s+the\s+draft\s+now\b/i,
      /\bbuilding\s+the\s+draft\s+now\b/i,
      /\bstructure\s+now\s+matches\b/i,
      /\b(?:the\s+)?draft\s+(?:has\s+been\s+|was\s+)?rebuilt\b/i,
    ],
  },
  {
    id: 'approve',
    label: 'approve draft',
    tools: ['approve_draft'],
    legacySignalTests: [],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+approved\b/i,
      /\bdraft\s+(?:has\s+been\s+|is\s+|was\s+)?approved\b/i,
      /\bmarked\s+(?:it\s+|the\s+draft\s+)?as\s+approved\b/i,
    ],
  },
  {
    id: 'publish',
    label: 'publish',
    tools: ['publish_journal'],
    legacySignalTests: [/\[PUBLISH_JOURNAL/i, /\[PUBLISH_DEVOTIONAL/i],
    claimPatterns: [
      /\b(?:has\s+been\s+|was\s+|is\s+now\s+)?published\b/i,
      /\bi(?:['’]ve| have)\s+published\b/i,
      /\blive\s+on\s+(?:the\s+)?site\b/i,
    ],
  },
  {
    id: 'schedule',
    label: 'schedule captions/posts',
    tools: ['schedule_captions'],
    legacySignalTests: [/\[SOCIAL_CAPTIONS\]/i, /\[PUBLISH_JOURNAL/i],
    claimPatterns: [
      /\b(?:has\s+been\s+|were\s+|was\s+)?scheduled\b/i,
      /\bi(?:['’]ve| have)\s+scheduled\b/i,
      /\bcaptions?\s+(?:are|were)\s+scheduled\b/i,
    ],
  },
  {
    id: 'generate_image',
    label: 'generate/attach image',
    tools: ['generate_image'],
    legacySignalTests: [/\[DALLE_GENERATE/i, /\[IMAGE_GENERATED/i],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:generated|attached|uploaded)\s+(?:the\s+)?(?:image|header|graphic)\b/i,
      /\b(?:image|header|graphic)\s+(?:has\s+been\s+|was\s+|is\s+)?(?:generated|attached|uploaded)\b/i,
      /\battached\s+(?:as\s+)?(?:the\s+)?header\b/i,
    ],
  },
  {
    id: 'quote_card',
    label: 'generate quote card',
    tools: ['generate_quote_card'],
    legacySignalTests: [/\[CARD[\s\S]*?\[\/CARD\]/i],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:generated|built|created)\s+(?:the\s+)?(?:quote\s+)?cards?\b/i,
      /\b(?:quote\s+)?cards?\s+(?:have\s+been\s+|were\s+|was\s+)?(?:generated|built|created)\b/i,
    ],
  },
  {
    id: 'reshare',
    label: 'trigger reshare',
    tools: ['trigger_reshare'],
    legacySignalTests: [/\[TRIGGER_RESHARE\]/i, /\[RESHARE_RESULT\]/i],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:run|triggered|started)\s+(?:the\s+)?reshare\b/i,
      /\breshare\s+(?:has\s+been\s+|was\s+|is\s+)?(?:run|triggered|complete|done)\b/i,
    ],
  },
  {
    id: 'fetch',
    label: 'fetch full text',
    tools: ['fetch_full_text'],
    legacySignalTests: [/\[CORPUS_FETCH_FULL_TEXT/i, /\[DRAFT_FETCH_FULL_TEXT/i],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:fetched|loaded|pulled)\s+(?:the\s+)?(?:full\s+)?(?:text|post|part)\b/i,
      /\b(?:full\s+)?(?:text|post)\s+(?:has\s+been\s+|was\s+)?(?:fetched|loaded|pulled)\b/i,
    ],
  },
];

const FUTURE_INTENT =
  /\b(i(?:['’]ll| will)|let me|going to|about to|i(?:['’]m| am) going to|next i(?:['’]ll| will)|i plan to|i(?:['’]ll| will) now)\b/i;

const NEGATED_CLAIM =
  /\b(not|never|nothing|none|isn['’]t|hasn['’]t|haven['’]t|didn['’]t|wasn['’]t|won['’]t|no)\b[\s\S]{0,40}$/i;

/**
 * Successful tool names from this turn’s toolResults.
 * @param {Array<{ name?: string, result?: { ok?: boolean } }>} toolResults
 * @returns {Set<string>}
 */
export function successfulToolNames(toolResults = []) {
  const set = new Set();
  for (const row of toolResults || []) {
    if (row?.name && row?.result?.ok) set.add(row.name);
  }
  return set;
}

/**
 * True when the matched claim sits in a clearly future-tense / intent sentence.
 * @param {string} reply
 * @param {number} index
 */
function isFutureIntentAround(reply, index) {
  const start = Math.max(0, index - 80);
  const window = reply.slice(start, index + 20);
  return FUTURE_INTENT.test(window);
}

/**
 * True when the claim is negated ("not published", "hasn't been saved").
 */
function isNegatedAround(reply, index) {
  const start = Math.max(0, index - 28);
  const before = reply.slice(start, index);
  return NEGATED_CLAIM.test(before);
}

/**
 * @param {string} reply
 * @param {{
 *   toolResults?: Array<{ name?: string, result?: { ok?: boolean } }>,
 *   toolsUsed?: string[],
 * }} evidence
 * @returns {{
 *   unbacked: Array<{ ruleId: string, label: string, matchedText: string, requiredTools: string[] }>,
 *   backedRuleIds: string[],
 * }}
 */
export function findUnbackedActionClaims(reply, evidence = {}) {
  const text = String(reply || '');
  if (!text.trim()) return { unbacked: [], backedRuleIds: [] };

  const okTools = successfulToolNames(evidence.toolResults);
  // toolsUsed alone is not enough (failed calls), but include as soft evidence only if
  // toolResults were not provided (older call sites). Prefer toolResults when present.
  const hasResultRows = Array.isArray(evidence.toolResults) && evidence.toolResults.length > 0;
  if (!hasResultRows && Array.isArray(evidence.toolsUsed)) {
    for (const name of evidence.toolsUsed) {
      if (name) okTools.add(name);
    }
  }

  const unbacked = [];
  const backedRuleIds = [];

  for (const rule of ACTION_CLAIM_RULES) {
    let matchedText = null;
    for (const pattern of rule.claimPatterns) {
      pattern.lastIndex = 0;
      const m = pattern.exec(text);
      if (!m) continue;
      if (isFutureIntentAround(text, m.index)) continue;
      if (isNegatedAround(text, m.index)) continue;
      matchedText = m[0];
      break;
    }
    if (!matchedText) continue;

    const toolBacked = rule.tools.some((t) => okTools.has(t));
    const legacyBacked = rule.legacySignalTests.some((re) => re.test(text));

    if (toolBacked || legacyBacked) {
      backedRuleIds.push(rule.id);
      continue;
    }

    unbacked.push({
      ruleId: rule.id,
      label: rule.label,
      matchedText,
      requiredTools: [...rule.tools],
    });
  }

  return { unbacked, backedRuleIds };
}

/**
 * System note for a regeneration turn (preferred fix path).
 * @param {Array<{ label: string, matchedText: string, requiredTools: string[] }>} unbacked
 */
export function buildUnbackedClaimCorrectionNote(unbacked) {
  const lines = (unbacked || []).map((u) => {
    const tools = (u.requiredTools || []).join(' or ');
    return `- Claimed "${u.matchedText}" (${u.label}) but no successful ${tools} tool call (and no legacy action signal) occurred this turn.`;
  });

  return (
    `SYSTEM CORRECTION — ACTION CLAIM GATE:\n` +
    `You claimed to have completed backend action(s) without a real successful tool result this turn:\n` +
    `${lines.join('\n')}\n\n` +
    `Do one of the following now:\n` +
    `1) Make the real tool call(s) with correct arguments and only then describe the outcome, OR\n` +
    `2) Rephrase as a plan / next step in future tense — do not state the action as already done.\n` +
    `Do not repeat false completion language.`
  );
}

/**
 * Convenience: true when regeneration is required.
 */
export function hasUnbackedActionClaims(reply, evidence = {}) {
  return findUnbackedActionClaims(reply, evidence).unbacked.length > 0;
}
