/**
 * gateActionClaims.js
 *
 * Blocks Auto from telling Bart an action already happened unless evidence backs
 * the claim. Destructive regenerate-and-replace is intentionally NOT used here —
 * chat.js annotates the streamed reply instead (keeps real content visible).
 *
 * Evidence scopes:
 * - turn: successful tool result (or legacy signal) from this turn only
 *   (approve / publish stay here — higher stakes)
 * - thread: this turn OR earlier successful tool results persisted on the thread
 *   (factual save-status reports like "is saved in drafts")
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   tools: string[],
 *   legacySignalTests: RegExp[],
 *   claimPatterns: RegExp[],
 *   evidenceScope?: 'turn' | 'thread',
 * }} ActionClaimRule
 */

/** @type {ActionClaimRule[]} */
export const ACTION_CLAIM_RULES = [
  {
    id: 'save_status',
    label: 'save status (already confirmed)',
    tools: ['save_draft'],
    evidenceScope: 'thread',
    legacySignalTests: [/\[JOURNAL_CONTENT\]/i, /\[DEVOTIONAL_CONTENT\]/i],
    claimPatterns: [
      /\bis saved(?:\s+in\s+drafts?)?\b/i,
      /\bsaved(?:\s+as\s+(?:a\s+)?draft)\b/i,
      /\bdraft\s+(?:has\s+been\s+|is\s+|was\s+)?saved\b/i,
      /\bstatus:\s*draft\b/i,
    ],
  },
  {
    id: 'save_or_rebuild',
    label: 'save/rebuild draft (this turn)',
    tools: ['save_draft', 'present_outline'],
    evidenceScope: 'turn',
    legacySignalTests: [/\[JOURNAL_CONTENT\]/i, /\[DEVOTIONAL_CONTENT\]/i],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:now\s+)?saved\b/i,
      /\brebuilt\b/i,
      /\brebuilding\s+the\s+draft\s+now\b/i,
      /\bbuilding\s+the\s+draft\s+now\b/i,
      /\bstructure\s+now\s+matches\b/i,
      /\b(?:the\s+)?draft\s+(?:has\s+been\s+|was\s+)?rebuilt\b/i,
    ],
  },
  {
    id: 'present_outline',
    label: 'present outline / brief',
    tools: ['present_outline'],
    evidenceScope: 'turn',
    legacySignalTests: [],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:presented|saved|locked)\s+(?:the\s+)?(?:outline|brief)\b/i,
      /\boutline\s+(?:has\s+been\s+|is\s+|was\s+)?(?:presented|saved|locked)\b/i,
    ],
  },
  {
    id: 'approve',
    label: 'approve draft',
    tools: ['approve_draft'],
    evidenceScope: 'turn',
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
    evidenceScope: 'turn',
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
    evidenceScope: 'turn',
    legacySignalTests: [/\[SOCIAL_CAPTIONS\]/i, /\[PUBLISH_JOURNAL/i],
    claimPatterns: [
      /\b(?:has\s+been\s+|were\s+|was\s+)?scheduled\b/i,
      /\bi(?:['’]ve| have)\s+scheduled\b/i,
      /\bcaptions?\s+(?:are|were)\s+scheduled\b/i,
    ],
  },
  {
    id: 'recommended_schedule',
    label: 'recommended peak / best posting times',
    tools: ['get_recommended_schedule'],
    evidenceScope: 'turn',
    legacySignalTests: [],
    claimPatterns: [
      /\bbest\s+(?:time|times|schedule)\b/i,
      /\bpeak\s+(?:time|times|engagement)\b/i,
      /\boptimal\s+(?:time|times|schedule)\b/i,
      /\bbased\s+on\s+your\s+last\s+\d+\s+posts?\b/i,
    ],
  },
  {
    id: 'list_stated_preferences',
    label: 'list standing preferences',
    tools: ['list_stated_preferences'],
    evidenceScope: 'turn',
    legacySignalTests: [],
    claimPatterns: [
      /\b(?:here\s+(?:are|is)|these\s+are)\s+(?:your\s+)?(?:standing\s+)?preferences?\b/i,
      /\bi\s+(?:currently\s+)?remember\s+(?:these|the\s+following)\b/i,
      /\bstored\s+(?:standing\s+)?preferences?\b/i,
    ],
  },
  {
    id: 'forget_stated_preference',
    label: 'forget / retract preference',
    tools: ['forget_stated_preference'],
    evidenceScope: 'turn',
    legacySignalTests: [],
    claimPatterns: [
      /\bi(?:['’]ve| have)\s+(?:forgotten|removed|retracted)\s+(?:that\s+)?preference\b/i,
      /\bpreference\s+(?:has\s+been\s+|was\s+)?(?:forgotten|removed|retracted|superseded)\b/i,
    ],
  },
  {
    id: 'generate_image',
    label: 'generate/attach image',
    tools: ['generate_image'],
    evidenceScope: 'turn',
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
    evidenceScope: 'turn',
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
    evidenceScope: 'turn',
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
    evidenceScope: 'turn',
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
 * Collect successful tool results persisted on earlier assistant messages in this thread.
 * @param {Array<{ role?: string, meta?: object }>} messages
 * @returns {Array<{ name?: string, result?: { ok?: boolean } }>}
 */
export function collectPriorSuccessfulToolResults(messages = []) {
  const out = [];
  for (const m of messages || []) {
    if (String(m?.role || '') !== 'assistant') continue;
    const meta = m?.meta && typeof m.meta === 'object' ? m.meta : null;
    if (!meta) continue;
    const rows = meta.tool_results || meta.toolResults;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row?.name && row?.result?.ok) out.push(row);
    }
    // Older / compact meta: tools_used list without full results
    if ((!rows || rows.length === 0) && Array.isArray(meta.tools_used)) {
      for (const name of meta.tools_used) {
        if (name) out.push({ name, result: { ok: true } });
      }
    }
  }
  return out;
}

function isFutureIntentAround(reply, index) {
  const start = Math.max(0, index - 80);
  const window = reply.slice(start, index + 20);
  return FUTURE_INTENT.test(window);
}

function isNegatedAround(reply, index) {
  const start = Math.max(0, index - 28);
  const before = reply.slice(start, index);
  return NEGATED_CLAIM.test(before);
}

/**
 * Skip matches that fall inside backticks or a long hyphen-joined slug/token,
 * not natural prose (e.g. do-we-have-...-published-...-hazing).
 * Conservative: normal sentences with spaces around the word are unaffected.
 */
export function isInsideCodeOrSlugSpan(reply, index, matchLength) {
  const text = String(reply || '');
  const idx = Math.max(0, Number(index) || 0);
  const len = Math.max(0, Number(matchLength) || 0);

  const before = text.slice(0, idx);
  const backtickCount = (before.match(/`/g) || []).length;
  if (backtickCount % 2 === 1) return true;

  const charBefore = idx > 0 ? text[idx - 1] : '';
  const charAfter = text[idx + len] || '';
  const flankedByHyphen = charBefore === '-' || charAfter === '-';
  if (!flankedByHyphen) return false;

  const windowStart = Math.max(0, idx - 40);
  const windowEnd = Math.min(text.length, idx + len + 40);
  const window = text.slice(windowStart, windowEnd);
  const hyphenRunMatch = window.match(/[a-z0-9]+(?:-[a-z0-9]+){4,}/i);
  return !!hyphenRunMatch;
}

/**
 * @param {string} reply
 * @param {{
 *   toolResults?: Array<{ name?: string, result?: { ok?: boolean } }>,
 *   priorToolResults?: Array<{ name?: string, result?: { ok?: boolean } }>,
 *   toolsUsed?: string[],
 * }} evidence
 * @returns {{
 *   unbacked: Array<{ ruleId: string, label: string, matchedText: string, requiredTools: string[], evidenceScope: string }>,
 *   backedRuleIds: string[],
 * }}
 */
export function findUnbackedActionClaims(reply, evidence = {}) {
  const text = String(reply || '');
  if (!text.trim()) return { unbacked: [], backedRuleIds: [] };

  const turnOk = successfulToolNames(evidence.toolResults);
  const hasResultRows = Array.isArray(evidence.toolResults) && evidence.toolResults.length > 0;
  if (!hasResultRows && Array.isArray(evidence.toolsUsed)) {
    for (const name of evidence.toolsUsed) {
      if (name) turnOk.add(name);
    }
  }

  const threadOk = new Set(turnOk);
  for (const name of successfulToolNames(evidence.priorToolResults)) {
    threadOk.add(name);
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
      if (isInsideCodeOrSlugSpan(text, m.index, m[0].length)) continue;
      matchedText = m[0];
      break;
    }
    if (!matchedText) continue;

    const scope = rule.evidenceScope === 'thread' ? 'thread' : 'turn';
    const okSet = scope === 'thread' ? threadOk : turnOk;
    const toolBacked = rule.tools.some((t) => okSet.has(t));
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
      evidenceScope: scope,
    });
  }

  return { unbacked, backedRuleIds };
}

/**
 * Internal correction note (kept for logging / tests). Not used to regenerate replies.
 */
export function buildUnbackedClaimCorrectionNote(unbacked) {
  const lines = (unbacked || []).map((u) => {
    const tools = (u.requiredTools || []).join(' or ');
    const scope =
      u.evidenceScope === 'thread'
        ? 'this thread'
        : 'this turn';
    return `- Claimed "${u.matchedText}" (${u.label}) but no successful ${tools} tool call (and no legacy action signal) was found for ${scope}.`;
  });

  return (
    `SYSTEM CORRECTION — ACTION CLAIM GATE:\n` +
    `You claimed to have completed backend action(s) without a real successful tool result:\n` +
    `${lines.join('\n')}\n\n` +
    `Do one of the following now:\n` +
    `1) Make the real tool call(s) with correct arguments and only then describe the outcome, OR\n` +
    `2) Rephrase as a plan / next step in future tense — do not state the action as already done.\n` +
    `Do not repeat false completion language.`
  );
}

/**
 * User-visible warning appended under the original streamed reply (never replaces it).
 */
export function buildVisibleUnbackedClaimWarning(unbacked) {
  const labels = (unbacked || []).map((u) => u.label).filter(Boolean);
  const unique = [...new Set(labels)];
  return (
    `---\n**⚠️ SYSTEM WARNING:** This reply claimed completed action(s) without a confirmed successful tool result (${unique.join(
      ', '
    ) || 'unknown'}). Treat those claims as unverified — the content above was kept as streamed; nothing above this line was rewritten by the server.`
  );
}

/**
 * Annotate a reply in place. Never replaces substantive content.
 * @returns {{ reply: string, appendedNote: string|null, unbacked: array }}
 */
export function annotateUnbackedActionClaims(reply, evidence = {}) {
  const original = String(reply || '');
  const { unbacked, backedRuleIds } = findUnbackedActionClaims(original, evidence);
  if (!unbacked.length) {
    return { reply: original, appendedNote: null, unbacked: [], backedRuleIds };
  }
  const appendedNote = buildVisibleUnbackedClaimWarning(unbacked);
  return {
    reply: `${original.trim()}\n\n${appendedNote}`.trim(),
    appendedNote,
    unbacked,
    backedRuleIds,
  };
}

export function hasUnbackedActionClaims(reply, evidence = {}) {
  return findUnbackedActionClaims(reply, evidence).unbacked.length > 0;
}
