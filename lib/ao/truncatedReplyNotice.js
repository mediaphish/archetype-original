/**
 * A turn that ran out of output room never ends in silence.
 *
 * 2026-09-24. Bart pasted an editing prompt for a 3200 word draft. Auto ran for
 * a while and stopped, and nothing came back at all. The logs said
 * "Unexpected stop reason: max_tokens": the model filled its output ceiling
 * partway through, and the only handling was a console warning. Bart's report
 * was "It ran for a while. Then it stopped. Never returned anything."
 *
 * The ceiling is bigger now, but no ceiling removes this case, so it has to be
 * visible when it happens. What Bart needs to know is which of the two things
 * is true: the draft was saved and the chat copy was cut off, or the work never
 * landed at all.
 */

/**
 * @param {{ savedDraft?: boolean, hasPartialText?: boolean }} context
 * @returns {string}
 */
export function truncatedReplyNotice({ savedDraft = false, hasPartialText = false } = {}) {
  if (savedDraft) {
    return (
      `${hasPartialText ? '\n\n' : ''}**This reply hit the output limit.** The draft was saved, so the work is not lost, ` +
      'but what you see above is cut off. Ask for the full post and it will be shown from the saved draft.'
    );
  }
  return (
    `${hasPartialText ? '\n\n' : ''}**This reply hit the output limit before anything was saved.** ` +
    'Nothing was written to the draft. Ask again, and ask for the changes without a full copy in the chat, ' +
    'which is what doubles the length of the turn.'
  );
}

/** Did this turn stop because it ran out of room? */
export function ranOutOfOutputRoom(stopReason) {
  return String(stopReason || '') === 'max_tokens';
}
