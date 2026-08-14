/**
 * Word-level draft diff helpers for the Auto review panel.
 * Pure functions — safe for Jest without a browser.
 */

import { diffWordsWithSpace } from 'diff';

/**
 * Compare prior version text to current draft text.
 * @returns {{ type: 'added'|'removed'|'unchanged', value: string }[]}
 */
export function buildDraftWordDiff(priorContent, currentContent) {
  const prior = priorContent == null ? '' : String(priorContent);
  const current = currentContent == null ? '' : String(currentContent);
  const parts = diffWordsWithSpace(prior, current);
  return parts.map((part) => {
    if (part.added) return { type: 'added', value: part.value };
    if (part.removed) return { type: 'removed', value: part.value };
    return { type: 'unchanged', value: part.value };
  });
}

/**
 * Pull slug from journal/devotional YAML front matter when present.
 */
export function extractSlugFromDraftContent(content) {
  const text = String(content || '');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const slugMatch = fm[1].match(/^\s*slug:\s*["']?([^\s"'#\n]+)/m);
  return slugMatch ? slugMatch[1].trim() : null;
}

export function formatVersionTimestamp(iso) {
  if (!iso) return 'Unknown time';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}
