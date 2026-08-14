/**
 * gateFabricatedCompletion.js
 *
 * Catch Auto describing material new verified details in the same turn as a
 * successful save_draft whose persisted content did not actually change.
 * Non-destructive — annotate only (same pattern as gateActionClaims / gateDenialClaims).
 */

const FABRICATION_CLAIM_PATTERNS = [
  /\bi\s+found\b/i,
  /\bconfirmed\b/i,
  /\bthe\s+real\s+detail\b/i,
  /\bverified\b/i,
  /\bi(?:['’]ve| have)\s+(?:now\s+)?(?:rebuilt|rewritten|updated|added)\b/i,
  /\brebuilt\s+(?:the\s+)?draft\b/i,
  /\bnew\s+(?:specific\s+)?(?:details?|facts?|material)\b/i,
  /\bfreshly\s+(?:verified|confirmed|researched)\b/i,
];

/**
 * @param {string} reply
 * @param {{
 *   toolResults?: Array<{ name?: string, result?: object }>,
 * }} evidence
 * @returns {{
 *   fabrications: Array<{ ruleId: string, matchedText: string, reason: string }>,
 * }}
 */
export function findFabricatedCompletions(reply, evidence = {}) {
  const text = String(reply || '');
  if (!text.trim()) return { fabrications: [] };

  const saveResults = (evidence.toolResults || []).filter(
    (r) => r?.name === 'save_draft' && r?.result?.ok
  );
  if (!saveResults.length) return { fabrications: [] };

  // Only fire when at least one save had a prior version and content did not change.
  const unchangedSaves = saveResults.filter(
    (r) => r.result?.had_prior_version && r.result?.content_unchanged === true
  );
  if (!unchangedSaves.length) return { fabrications: [] };

  let matchedText = null;
  for (const pattern of FABRICATION_CLAIM_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m) {
      matchedText = m[0];
      break;
    }
  }
  if (!matchedText) return { fabrications: [] };

  return {
    fabrications: [
      {
        ruleId: 'fabricated_content_completion',
        matchedText,
        reason:
          'Reply claimed new verified/rebuilt material, but save_draft persisted unchanged content vs the prior draft version.',
        slug: unchangedSaves[0]?.result?.slug || null,
      },
    ],
  };
}

export function buildVisibleFabricatedCompletionWarning(fabrications) {
  const bits = (fabrications || []).map((f) => f.matchedText).filter(Boolean);
  const unique = [...new Set(bits)];
  return (
    `---\n**⚠️ SYSTEM WARNING:** This reply described new verified or rebuilt draft details ` +
    `(${unique.join(', ') || 'content claims'}), but the successful save_draft call did not change ` +
    `the stored draft content from the previous version. Treat those content claims as unverified — ` +
    `the text above was kept as streamed; nothing above this line was rewritten by the server.`
  );
}

export function annotateFabricatedCompletions(reply, evidence = {}) {
  const original = String(reply || '');
  const { fabrications } = findFabricatedCompletions(original, evidence);
  if (!fabrications.length) {
    return { reply: original, appendedNote: null, fabrications: [] };
  }
  const appendedNote = buildVisibleFabricatedCompletionWarning(fabrications);
  return {
    reply: `${original.trim()}\n\n${appendedNote}`.trim(),
    appendedNote,
    fabrications,
  };
}
