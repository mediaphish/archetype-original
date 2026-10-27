/**
 * Bart's word comes first in a team thread.
 *
 * Bart, 2026-10-27: "I was trying to say Generate image and couldn't get a
 * word in... Can we allow me to submit message while they are still
 * jabbering?" and, on the Retry button, "Auto failed and I had to touch the
 * retry button" (his notes were then saved twice).
 */

const RETRY_WINDOW_MS = 15 * 60 * 1000;
/** The first send may still be running on the server for this long. */
const STILL_WORKING_MS = 6 * 60 * 1000;

const isTeamNote = (m) =>
  m?.role === 'user' && (m.meta?.team_note || m.meta?.team_task || /^\s*\[(TEAM|TEAM TASK|SYSTEM)/.test(String(m.content || '')));

/**
 * Pure: what a Retry of `text` should do, given the thread's messages (oldest first).
 * - answered: the first send was already answered; show that reply.
 * - working: the first send is still being answered; wait for it.
 * - reuse: the first send was saved but never answered; answer it without saving it again.
 * - new: nothing matches; send it as a new message.
 */
export function retryDecision(messages = [], text = '', nowMs = Date.now()) {
  const list = Array.isArray(messages) ? messages : [];
  const wanted = String(text || '').trim();
  let idx = -1;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (m.role === 'user' && !isTeamNote(m)) {
      idx = i;
      break;
    }
  }
  if (idx < 0 || String(list[idx].content || '').trim() !== wanted) return { action: 'new' };
  const age = nowMs - Date.parse(list[idx].created_at || 0);
  if (!(age >= 0 && age < RETRY_WINDOW_MS)) return { action: 'new' };
  const reply = list.slice(idx + 1).find((m) => m.role === 'assistant' && String(m.content || '').trim());
  if (reply) return { action: 'answered', reply: String(reply.content) };
  if (age < STILL_WORKING_MS) return { action: 'working' };
  return { action: 'reuse', message: list[idx] };
}
