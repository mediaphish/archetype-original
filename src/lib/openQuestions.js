/**
 * The questions the team has put to Bart that he has not answered yet.
 *
 * 2026-10-27. Jot asked "Does 'own the answer' match how you'd say it?" and
 * Red's reply landed right after, pushing the question off the screen. Bart:
 * "I don't like missing actions I need to be taking." The open questions are
 * pinned above the message box until he answers them.
 *
 * A teammate's question is the question in the last paragraph of their
 * message, outside any quoted text or saved draft. Any reply from Bart closes
 * every question asked before it (Bart, 2026-10-27: "It just doesn't make
 * sense for an old question to stay open when I've responded to it."). The
 * strip also hides a question the moment he taps it (see AutoV2Panel).
 */
import { TEAM_NAMES } from './teamStatus.js';

// [TEAM] notes and [TEAM TASK from ...] hand-offs are the system, not Bart.
const isTeamNote = (m) => Boolean(m?.meta?.team_note) || /^\s*\[TEAM\b/.test(String(m?.content || ''));
const squash = (t) => String(t || '').replace(/[*_`>]/g, '').replace(/\s+/g, ' ').trim();

const YES_NO = /^(does|do|did|is|are|was|can|could|should|would|will|shall|want|ok|okay|sound|good|ready|happy|any objection|shall|may)\b/i;

/** Hides quoted text (a line of the post, a title) so its "?" is not taken for a question to Bart. */
function maskQuotes(text) {
  return text.replace(/"[^"\n]*"|“[^”\n]*”/g, (q) => q.replace(/[^\s]/g, 'x'));
}

/** Pure: the question sentences in a message's last paragraph. */
export function questionOf(content) {
  const paragraphs = String(content || '')
    // A saved draft shown in the message is the post, not a question.
    .replace(/\[ARTIFACT[^\]]*\][\s\S]*?(\[\/ARTIFACT\]|$)/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const last = paragraphs[paragraphs.length - 1] || '';
  if (!last.includes('?') || /^\s*>/.test(last)) return null;
  const text = squash(last).replace(/^(Ada|Jot|Vox|Cam|Red):\s*/, '');
  const masked = maskQuotes(text);
  const out = [];
  const re = /[^.?!]*\?/g;
  let m;
  while ((m = re.exec(masked))) {
    const original = text.slice(m.index, m.index + m[0].length).trim();
    if (original.length > 3) out.push(original);
  }
  return out.join(' ') || null;
}

/**
 * Pure: open questions, oldest first.
 * @returns {Array<{ id: string, agent: string, name: string, question: string, yesNo: boolean }>}
 */
export function openQuestions(messages) {
  let open = [];
  (Array.isArray(messages) ? messages : []).forEach((m, i) => {
    if (!m || isTeamNote(m)) return;
    if (m.role === 'assistant') {
      const question = questionOf(m.content);
      if (!question) return;
      const agent = m.meta?.agent || 'auto';
      open = open.filter((q) => q.agent !== agent); // a teammate's newer question replaces their older one
      open.push({ id: String(m.id || i), agent, name: TEAM_NAMES[agent] || 'Ada', question, yesNo: YES_NO.test(question) });
    } else if (m.role === 'user') {
      open = [];
    }
  });
  return open;
}

/** Pure: the reply text that answers one question, quoting it. */
export function quotedReply(question, answer = '') {
  return `> ${squash(question)}\n\n${answer}`;
}
