/**
 * Only Bart approves (2026-10-27: Red edited the Josiah post after Bart
 * approved it, and a team task had marked the outline approved).
 */

/**
 * Pure: a background team task may not change a post Bart approved, and may
 * not mark anything approved. Only Bart approves. Returns a refusal or null.
 */
export function approvedPostGuard({ ctx = {}, existing = null, input = {} } = {}) {
  if (!ctx?.taskId) return null;
  if (existing?.status === 'approved' && String(input?.content || '').trim() !== String(existing.content || '').trim()) {
    return {
      ok: false,
      gate: 'approved_by_bart',
      error: 'Bart already approved this post, so it is not changed by team work. Tell Bart in a line or two what you would change and why, and let him decide.',
    };
  }
  if (String(input?.status || '').toLowerCase() === 'approved' && existing?.status !== 'approved') {
    return {
      ok: false,
      gate: 'approval_is_barts',
      error: 'Only Bart approves a post. Save it as a draft and ask him.',
    };
  }
  return null;
}
