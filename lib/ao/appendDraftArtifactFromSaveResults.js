/**
 * After a successful full-length save_draft this turn, guarantee an [ARTIFACT]
 * tag built from the real saved content so the review panel and chat both show
 * the current draft — even when the model only narrated changes in prose (#131).
 */

import { isFullLengthDraftContent } from './waypointGates.js';

function escapeAttr(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, "'");
}

export function replyHasArtifactTag(reply) {
  return /\[ARTIFACT[^\]]*\]/i.test(String(reply || ''));
}

/**
 * Strip bulky draft bodies from tool_results before message meta persistence.
 * Keeps content_length for diagnostics / fabrication gate.
 */
export function sanitizeToolResultsForMeta(toolResults = []) {
  return (toolResults || []).map((row) => {
    if (!row || typeof row !== 'object') return row;
    if (row.name !== 'save_draft' || !row.result || typeof row.result !== 'object') return row;
    if (row.result.content == null) return row;
    const { content, ...rest } = row.result;
    return {
      ...row,
      result: {
        ...rest,
        content_length:
          rest.content_length != null ? rest.content_length : String(content || '').length,
      },
    };
  });
}

/**
 * @param {string} reply
 * @param {Array<{ name?: string, result?: object }>} toolResults
 * @returns {{ reply: string, appended: boolean, slug: string|null }}
 */
export function appendDraftArtifactFromSaveResults(reply, toolResults = []) {
  let fullReply = String(reply || '');
  if (replyHasArtifactTag(fullReply)) {
    return { reply: fullReply, appended: false, slug: null };
  }

  const saveResults = (toolResults || []).filter(
    (r) =>
      r?.name === 'save_draft' &&
      r?.result?.ok &&
      typeof r.result.content === 'string' &&
      isFullLengthDraftContent(r.result.content) &&
      ['journal', 'devotional'].includes(String(r.result.kind || '').toLowerCase())
  );

  if (!saveResults.length) {
    return { reply: fullReply, appended: false, slug: null };
  }

  // Prefer the last successful full save this turn (latest content).
  const save = saveResults[saveResults.length - 1].result;
  const label = escapeAttr(save.title || save.slug || 'Draft');
  const block = `\n\n[ARTIFACT type="draft" label="${label}"]\n${save.content}\n[/ARTIFACT]`;
  fullReply = `${fullReply.trim()}${block}`;

  return {
    reply: fullReply,
    appended: true,
    slug: save.slug || null,
  };
}
