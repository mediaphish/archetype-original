/**
 * What the chat says when nobody on the team is working.
 *
 * Bart, 2026-10-27, looking at a quiet conversation: "I assume the agents are
 * still working in the background? This is where I asked for something
 * visible that told me this was happening. Right now, I have no clue." The
 * working animation shows while someone works; this line covers the rest of
 * the time, so silence never has to be guessed at.
 */

export const TEAM_NAMES = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red', designer: 'Des', it: 'Bit' };

const isTeamNote = (m) => Boolean(m?.meta?.team_note) || /^\s*\[TEAM\]/.test(String(m?.content || ''));

/**
 * Pure: the idle line for a conversation, or null when there is nothing to say.
 * @param {Array<{role: string, content?: string, meta?: object}>} messages
 * @returns {string | null}
 */
export function idleStatus(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || isTeamNote(m)) continue;
    if (m.role === 'assistant') {
      const name = TEAM_NAMES[m.meta?.agent] || 'Ada';
      return `Nobody is working right now. ${name} is waiting on your reply.`;
    }
    return 'Nobody is working right now. Your last message has no reply yet. Send it again to get one.';
  }
  return null;
}
