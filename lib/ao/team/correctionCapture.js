/**
 * Catches Bart's corrections when no teammate saved them.
 *
 * Bart, 2026-10-27: "I definitely want my input, especially, when I correct
 * someone on the team to locked in as training across the board." Teammates
 * are told to save every correction with save_note, but an instruction can be
 * skipped, so after each of his messages the chat asks once: did he just
 * correct the team in a way that should hold next time? If so, the lesson is
 * kept in his words (lib/ao/team/designNotes.js) and every teammate reads it
 * from the next turn on. Design feedback on an image is kept even if this
 * check cannot run.
 */
import { completeJson } from '../textModel.js';
import { NOTE_AREAS, normalizeArea, saveDesignNote, listDesignNotes, isDesignFeedback, feedbackAsNote } from './designNotes.js';

const APPROVAL_ONLY = /^\s*(yes|yep|yeah|approved?|ok(ay)?|looks (good|great)|love it|perfect|great|good|go|do it|ship it|thanks?|thank you)\b[\s.!]*$/i;

/** Pure: worth asking about at all. Team notes, bare approvals and short replies are not. */
export function worthChecking(message) {
  const text = String(message || '').trim();
  if (!text || /^\s*\[(TEAM|SYSTEM)/.test(text)) return false;
  const own = text.replace(/^\s*>.*$/gm, '').trim();
  if (!own || APPROVAL_ONLY.test(own)) return false;
  return own.split(/\s+/).filter(Boolean).length >= 6;
}

/** Pure: what the team said just before his message, so the check knows what he is answering. */
export function lastTeamWork(priorMessages) {
  const list = Array.isArray(priorMessages) ? priorMessages : [];
  const out = [];
  for (let i = list.length - 1; i >= 0 && out.length < 3; i -= 1) {
    const m = list[i];
    if (m?.role === 'user' && !/^\s*\[(TEAM|SYSTEM)/.test(String(m.content || ''))) break;
    if (m?.role === 'assistant') out.unshift(String(m.content || '').slice(0, 2500));
  }
  return out.join('\n\n---\n\n');
}

/** Pure: read the check's answer into a lesson to keep, or null. */
export function lessonFrom(answer) {
  if (!answer || typeof answer !== 'object') return null;
  const lesson = String(answer.lesson || '').replace(/\s+/g, ' ').trim();
  if (!answer.correction || lesson.length < 12) return null;
  return { lesson: lesson.slice(0, 1200), area: normalizeArea(answer.area), applies_to: String(answer.applies_to || 'all').slice(0, 120) || 'all' };
}

/**
 * @returns {Promise<{ saved: boolean, how?: string, lesson?: string }>}
 */
export async function captureCorrection({ email, userMessage, priorMessages = [], threadId = null, about = null }) {
  if (!worthChecking(userMessage)) return { saved: false };
  const existing = await listDesignNotes(email, { limit: 40 }).catch(() => []);
  const prompt = [
    'Bart Paden runs a small creative team (Ada directs, Jot writes, Red edits, Des designs, Vox schedules, Cam produces). He wants every correction he makes to anyone on the team kept as standing training for everyone.',
    '',
    'WHAT THE TEAM JUST SAID OR SHOWED HIM:',
    lastTeamWork(priorMessages) || '(nothing recent)',
    '',
    'BART\'S MESSAGE:',
    String(userMessage || '').slice(0, 4000),
    '',
    'LESSONS ALREADY KEPT:',
    existing.length ? existing.map((n) => `- (${n.area || 'design'}) ${n.note}`).join('\n') : '(none)',
    '',
    'Is Bart correcting, overriding or rejecting something the team did, in a way that tells them how to do it next time? A plain approval, a new request, a question, or a fact about this one piece with no lesson in it is not a correction. If the lesson is already kept above, it is not new.',
    `Reply as JSON: {"correction": true|false, "lesson": "the lesson in Bart's own words, as close to verbatim as you can, rewritten only enough to stand on its own next time", "area": one of ${JSON.stringify(NOTE_AREAS)}, "applies_to": "all, or the series or kind of piece it is about"}.`,
  ].join('\n');
  const answer = await completeJson({ prompt, task: 'extract', maxTokens: 400 }).catch(() => null);
  const found = lessonFrom(answer);
  if (found) {
    const saved = await saveDesignNote({ email, note: found.lesson, area: found.area, appliesTo: found.applies_to, about, threadId, source: 'captured' });
    return { saved: !!saved?.ok, how: 'check', lesson: found.lesson };
  }
  // The check could not run, but design feedback on an image is never lost.
  if (answer === null && isDesignFeedback(userMessage, priorMessages)) {
    const saved = await saveDesignNote({ email, note: feedbackAsNote(userMessage), area: 'design', about, threadId, source: 'captured' });
    return { saved: !!saved?.ok, how: 'design_fallback' };
  }
  return { saved: false };
}
