/**
 * Artifact panel sync helpers (#131).
 * Pure — used by AutoV2Panel and selftests.
 */

/**
 * @param {string} text
 * @returns {{ artifact: { type: string, label: string, content: string } | null, cleanText: string }}
 */
export function parseArtifact(text) {
  if (!text) return { artifact: null, cleanText: text };

  const tagPattern = /\[ARTIFACT([^\]]*)\]([\s\S]*?)\[\/ARTIFACT\]/i;
  const match = text.match(tagPattern);

  if (!match) return { artifact: null, cleanText: text };

  const attrString = match[1] || '';
  const content = match[2]?.trim() || '';

  const typeMatch = attrString.match(/type="([^"]+)"/i);
  const labelMatch = attrString.match(/label="([^"]+)"/i);

  const artifact = {
    type: typeMatch?.[1] || 'draft',
    label: labelMatch?.[1] || 'Artifact',
    content,
  };

  const cleanText = text.replace(tagPattern, '').trim();
  return { artifact, cleanText };
}

/**
 * Prefer the latest assistant message's artifact; if missing, walk backward.
 * Does not clear — returns null only when no message in the thread has a tag.
 * @param {Array<{ role?: string, content?: string }>} msgs
 */
export function findLatestArtifactInMessages(msgs = []) {
  const all = Array.isArray(msgs) ? msgs : [];
  for (const m of [...all].reverse()) {
    if (String(m?.role || '') !== 'assistant') continue;
    const { artifact } = parseArtifact(String(m.content || ''));
    if (artifact) return artifact;
  }
  return null;
}

/**
 * Decide panel artifact for a message list.
 * @returns {{
 *   artifact: object|null,
 *   clear: boolean,
 *   source: 'latest'|'fallback'|'none'|'empty_thread'
 * }}
 */
export function resolveArtifactPanelState(msgs = []) {
  const all = Array.isArray(msgs) ? msgs : [];
  const hasAssistant = all.some((m) => String(m?.role || '') === 'assistant');
  if (!hasAssistant) {
    return { artifact: null, clear: true, source: 'empty_thread' };
  }

  const lastAssistant = [...all].reverse().find((m) => String(m?.role || '') === 'assistant');
  const fromLatest = parseArtifact(String(lastAssistant?.content || '')).artifact;
  if (fromLatest) {
    return { artifact: fromLatest, clear: false, source: 'latest' };
  }

  const fallback = findLatestArtifactInMessages(all);
  if (fallback) {
    return { artifact: fallback, clear: false, source: 'fallback' };
  }

  // Conversational turn with no tags in history — keep existing panel (caller must not clear).
  return { artifact: null, clear: false, source: 'none' };
}
