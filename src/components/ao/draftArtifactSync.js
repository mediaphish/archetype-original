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
  // slug is written by appendDraftArtifactFromSaveResults from 2026-09-13 on.
  // Older messages do not carry it; see draftArtifactSlug.js for the fallback.
  const slugMatch = attrString.match(/slug="([^"]+)"/i);

  const artifact = {
    type: typeMatch?.[1] || 'draft',
    label: labelMatch?.[1] || 'Artifact',
    content,
    ...(slugMatch ? { slug: slugMatch[1].trim() } : {}),
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
    return { artifact: keepPostTabs(fromLatest, all), clear: false, source: 'latest' };
  }

  const fallback = findLatestArtifactInMessages(all);
  if (fallback) {
    return { artifact: keepPostTabs(fallback, all), clear: false, source: 'fallback' };
  }

  // A teammate worked on a draft that was written in another conversation
  // (approved it, made its image, scheduled it). Bart, 2026-10-25: "All my tabs
  // on the right above the artifact panel are now gone." Open that draft here
  // so its tabs follow the work.
  const worked = findDraftWorkedByTools(all);
  if (worked) {
    return { artifact: worked, clear: false, source: 'tools' };
  }

  // Conversational turn with no tags in history — keep existing panel (caller must not clear).
  return { artifact: null, clear: false, source: 'none' };
}

/**
 * A journal post's captions belong in that post's Captions tab, never in a
 * panel of their own. 2026-10-27: Cam sent the caption set as its own panel
 * item, the post's tabs disappeared, and Bart saw the approved header stacked
 * over raw caption text: "The used to be dropped into the Captions tab on the
 * artifact panel. What happened?" When the thread has a journal post, the post
 * stays in the panel and its Captions tab reads the captions from the chat.
 */
export function keepPostTabs(artifact, msgs = []) {
  if (!artifact || artifact.type !== 'captions') return artifact;
  const all = Array.isArray(msgs) ? msgs : [];
  for (const m of [...all].reverse()) {
    if (String(m?.role || '') !== 'assistant') continue;
    const { artifact: a } = parseArtifact(String(m.content || ''));
    if (a && a.type === 'draft') return a;
  }
  return findDraftWorkedByTools(all) || artifact;
}

const DRAFT_TOOLS = new Set([
  'save_draft',
  'present_outline',
  'approve_draft',
  'approve_stage',
  'generate_image',
  'schedule_captions',
  'schedule_journal_publish',
  'get_schedule_status',
  'publish_journal',
]);

/** The newest journal draft a reply's tools touched, as a panel artifact to load by slug. */
export function findDraftWorkedByTools(msgs = []) {
  const all = Array.isArray(msgs) ? msgs : [];
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const m = all[i];
    if (String(m?.role || '') !== 'assistant') continue;
    const rows = Array.isArray(m?.meta?.tool_results) ? m.meta.tool_results : [];
    for (let j = rows.length - 1; j >= 0; j -= 1) {
      const row = rows[j];
      if (!row || !DRAFT_TOOLS.has(row.name)) continue;
      const r = row.result && typeof row.result === 'object' ? row.result : {};
      const slug = String(r.slug || r.draft?.slug || '').trim();
      if (!slug || r.ok === false) continue;
      if (r.kind && r.kind !== 'journal') continue;
      return { type: 'draft', slug, label: String(r.title || r.draft?.title || slug), content: '' };
    }
  }
  return null;
}
