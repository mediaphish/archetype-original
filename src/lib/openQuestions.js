/**
 * The questions the team has put to Bart that he has not answered yet.
 *
 * 2026-10-27. Jot asked "Does 'own the answer' match how you'd say it?" and
 * Red's reply landed right after, pushing the question off the screen. Bart:
 * "I don't like missing actions I need to be taking." The open questions are
 * pinned above the message box until he answers them.
 *
 * A teammate's question is the question in the last paragraph of their
 * message. Bart's reply answers it: a reply that quotes one question answers
 * that one only (so two stacked questions can be taken one at a time), and a
 * reply without a quote answers everything open.
 */
import { TEAM_NAMES } from './teamStatus.js';

const isTeamNote = (m) => Boolean(m?.meta?.team_note) || /^\s*\[TEAM\]/.test(String(m?.content || ''));
const squash = (t) => String(t || '').replace(/[*_`>]/g, '').replace(/\s+/g, ' ').trim();

const YES_NO = /^(does|do|did|is|are|was|can|could|should|would|will|shall|want|ok|okay|sound|good|ready|happy|any objection|shall|may)\b/i;

/** Pure: the question sentences in a message's last paragraph. */
export function questionOf(content) {
  const paragraphs = String(content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const last = paragraphs[paragraphs.length - 1] || '';
  if (!last.includes('?') || /^\s*>/.test(last)) return null;
  const sentences = squash(last)
    .replace(/^(Ada|Jot|Vox|Cam|Red):\s*/, '')
    .match(/[^.?!]*\?/g);
  const q = (sentences || []).map((s) => s.trim()).filter((s) => s.length > 3).join(' ');
  return q || null;
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
      const quoted = String(m.content || '')
        .split('\n')
        .filter((l) => /^\s*>/.test(l))
        .map(squash)
        .join(' ');
      open = quoted ? open.filter((q) => !quoted.includes(squash(q.question).slice(0, 60))) : [];
    }
  });
  return open;
}

/** Pure: the reply text that answers one question, quoting it. */
export function quotedReply(question, answer = '') {
  return `> ${squash(question)}\n\n${answer}`;
}
