/**
 * The review queue: Bart's notes on a draft, worked one at a time.
 *
 * The workflow he described on 2026-09-08, in his words:
 *
 *   "I submit a single message with a whole bunch of notes. When it responds,
 *    it says, 'Here's the first one. Let's talk about it'... Then we have a
 *    dialogue, then I approve, and then we move on to the next one. Once we're
 *    done going through all of those, I am happy to give a command to tell it
 *    to go write."
 *
 * What it replaces: he sent nine notes containing three direct questions, and
 * Auto responded by regenerating the entire 2,700 word post. Three times. It
 * never answered a single question. He had to say "Why didn't you explain
 * yourself? Why did you just write?" twice before it stopped.
 *
 * THE RULE THAT MATTERS MOST, and it is his correction to my first design:
 *
 *   "4 of 9 may be word swaps, but some of those I asked for explanation as to
 *    why the words were chosen... sometimes the point of asking why is because
 *    there may be a reason a word was chosen that I didn't already understand."
 *
 * I had proposed batching small edits to save round trips. That is wrong, and
 * it is wrong in the precise direction that recreates the original failure: it
 * lets Auto skip his questions whenever the edit looks trivial. So the test is
 * not how big the change is. It is whether he asked something.
 *
 *   A note containing a question ALWAYS gets answered. Never batched, never
 *   silently applied, no exceptions.
 *
 * Pure module, no IO. The queue persists in ao_content_drafts.metadata.notes,
 * which already exists as jsonb and already holds the outline brief, so this
 * needs no migration and survives a reload.
 */

/** Note lifecycle. `blocked` means Auto disagreed and is waiting on Bart. */
export const NOTE_STATUS = ['pending', 'discussing', 'agreed', 'declined', 'applied'];

/**
 * Does this note demand an answer before anything is changed?
 *
 * Deliberately generous. A false positive costs one exchange. A false negative
 * costs a question Bart asked being silently ignored, which is the failure this
 * entire module exists to prevent.
 */
export function noteAsksAQuestion(text) {
  const t = String(text || '').trim();
  if (!t) return false;

  if (t.includes('?')) return true;

  // Requests for reasoning that are not phrased as questions. "Tell me why it
  // got through", "make your case", "explain the choice", "I'm not sure why you
  // chose to use it here."
  return /\b(tell me why|explain (why|that|this|the|your)|make your case|why (did|do|would|was|were|is|are)|walk me through|justify|your reasoning|not sure why|i don'?t understand)\b/i.test(
    t
  );
}

/**
 * Does this note express disagreement with Auto, or invite it?
 *
 * "If you disagree here, make your case" is not a directive. Treating it as one
 * is how the Boisjoly objection got silently rewritten instead of discussed.
 */
export function noteInvitesDebate(text) {
  const t = String(text || '').trim();
  return /\b(if you disagree|make your case|push back|do you agree|am i (right|wrong)|change my mind|convince me|thoughts\??)\b/i.test(
    t
  );
}

/**
 * Classify one note.
 *
 * `needsDialogue` is the only field that gates behavior. Everything else is for
 * display and for explaining to Bart why a note was handled the way it was.
 */
export function classifyNote(text) {
  const asksQuestion = noteAsksAQuestion(text);
  const invitesDebate = noteInvitesDebate(text);

  return {
    asksQuestion,
    invitesDebate,
    // A note is only safe to apply without discussion when Bart asked for
    // nothing back. Size of the edit is explicitly NOT part of this test.
    needsDialogue: asksQuestion || invitesDebate,
  };
}

/**
 * Build a queue from parsed note texts.
 *
 * Parsing the message into notes is a judgment task and belongs to the model.
 * This takes the result and gives it structure, an id, and a status.
 */
export function buildQueue(noteTexts, { draftSlug = null } = {}) {
  const notes = (Array.isArray(noteTexts) ? noteTexts : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((text, i) => ({
      id: i + 1,
      text,
      status: 'pending',
      ...classifyNote(text),
      resolution: null,
    }));

  return { draftSlug, createdAt: new Date().toISOString(), notes };
}

/** The next note to work, or null when the queue is done. */
export function nextNote(queue) {
  const notes = queue?.notes || [];
  return notes.find((n) => n.status === 'pending' || n.status === 'discussing') || null;
}

/** Is every note settled? */
export function queueIsWorked(queue) {
  const notes = queue?.notes || [];
  if (notes.length === 0) return true;
  return notes.every((n) => ['agreed', 'declined', 'applied'].includes(n.status));
}

/**
 * The echo Bart sees before any work starts.
 *
 * Its only job is to prove nothing was dropped. The one silent failure this
 * design can have is Auto parsing nine notes into six, which would look
 * exactly like success. Counting them out loud makes that visible in one line,
 * and the same class of silent loss has bitten this project repeatedly.
 */
export function summarizeQueue(queue) {
  const notes = queue?.notes || [];
  if (notes.length === 0) return 'No notes found in that message.';

  const questions = notes.filter((n) => n.needsDialogue).length;
  const lines = notes.map((n) => `${n.id}. ${n.needsDialogue ? '[needs answer] ' : ''}${firstLine(n.text)}`);

  const head =
    `${notes.length} note${notes.length === 1 ? '' : 's'}` +
    (questions ? `, ${questions} asking for an answer` : '');

  return `${head}:\n${lines.join('\n')}`;
}

/** How the queue stands mid-pass. */
export function queueProgress(queue) {
  const notes = queue?.notes || [];
  const by = (s) => notes.filter((n) => n.status === s).length;
  return {
    total: notes.length,
    pending: by('pending'),
    discussing: by('discussing'),
    agreed: by('agreed'),
    declined: by('declined'),
    applied: by('applied'),
    worked: queueIsWorked(queue),
  };
}

/** Record the outcome of a note without mutating the caller's object. */
export function resolveNote(queue, id, status, resolution = null) {
  if (!NOTE_STATUS.includes(status)) {
    throw new Error(`resolveNote: unknown status "${status}"`);
  }
  return {
    ...queue,
    notes: (queue?.notes || []).map((n) =>
      n.id === id ? { ...n, status, resolution: resolution ?? n.resolution } : n
    ),
  };
}

/**
 * May Auto produce prose right now?
 *
 * Enforced in code rather than asked for in the prompt. Every soft instruction
 * this project has relied on has been ignored under generation pressure, and
 * this is the one that stops a 2,700 word regeneration from landing on top of
 * an unanswered question.
 */
export function mayWrite(queue, { explicitGoAhead = false } = {}) {
  if (explicitGoAhead) return { ok: true };

  const notes = queue?.notes || [];
  if (notes.length === 0) return { ok: true };

  if (!queueIsWorked(queue)) {
    const open = notes.filter((n) => !['agreed', 'declined', 'applied'].includes(n.status));
    const unanswered = open.filter((n) => n.needsDialogue);
    return {
      ok: false,
      reason: 'queue_open',
      error:
        `Not writing yet. ${open.length} of ${notes.length} notes are still open` +
        (unanswered.length
          ? `, and ${unanswered.length} of those asked a question that has not been answered.`
          : '.') +
        ' Work the notes first, then Bart says go.',
    };
  }

  return { ok: true };
}

function firstLine(text) {
  const line = String(text || '').split('\n')[0].trim();
  return line.length > 110 ? `${line.slice(0, 107)}...` : line;
}
