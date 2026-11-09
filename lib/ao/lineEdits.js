/** Line fixes for saved drafts (2026-11-09). See edit_draft_lines in autoToolHandlers.js. */

/**
 * Pure: apply exact find-and-replace edits to a draft. Each find must appear
 * exactly once, so a fix never lands in the wrong place.
 */
export function applyLineEdits(content, edits = []) {
  let text = String(content || '');
  const changes = [];
  for (const e of Array.isArray(edits) ? edits : []) {
    const find = String(e?.find ?? '');
    const replace = String(e?.replace ?? '');
    if (!find.trim()) return { ok: false, error: 'Each edit needs the exact text to find.' };
    const first = text.indexOf(find);
    if (first === -1) return { ok: false, error: `This text is not in the saved draft, word for word: "${find.slice(0, 160)}". Fetch the draft and copy the passage exactly.` };
    if (text.indexOf(find, first + find.length) !== -1) return { ok: false, error: `This text appears more than once: "${find.slice(0, 160)}". Include more of the sentence so it is unique.` };
    text = text.slice(0, first) + replace + text.slice(first + find.length);
    changes.push({ before: find, after: replace });
  }
  if (!changes.length) return { ok: false, error: 'No edits were given.' };
  return { ok: true, content: text, changes };
}
