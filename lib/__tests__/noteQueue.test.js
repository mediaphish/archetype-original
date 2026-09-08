/**
 * @jest-environment node
 *
 * Built from the real failure. On 2026-09-08 Bart sent nine notes on the Cain
 * draft containing three direct questions. Auto regenerated the whole 2,700
 * word post three times and never answered one of them.
 *
 * The notes below are his actual words from that message.
 */
import {
  buildQueue,
  classifyNote,
  noteAsksAQuestion,
  noteInvitesDebate,
  nextNote,
  queueIsWorked,
  queueProgress,
  resolveNote,
  summarizeQueue,
  mayWrite,
} from '../ao/noteQueue.js';

// Verbatim from the transcript, abridged only in length.
const REAL_NOTES = [
  `"The plainer sense is just lying there." This doesn't fit my tone and voice.`,
  `I get what you're doing with the word "line," but I think it's more a standard he's decided to hold.`,
  `"Sit with" is on the banned list outright. Fix the line. Then tell me why it got through, since this is the second draft where it survived.`,
  `"Entry one in this series was Daniel." This is far from entry 1. I think it's entry 10 or 11.`,
  `Who told him to his face? Was it Adam, his father? Was it God?`,
  `I would never say the word "caucused." I'm not even sure why you chose to use it here?`,
  `"Boisjoly" was the good guy. I'm not sure we can call it Cain's mechanism. If you disagree here, make your case.`,
  `"He knew the pattern he was substituting around." That is not a phrase that I would use ever.`,
  `Change the header to "Four reigns, one line."`,
];

describe('noteAsksAQuestion', () => {
  it('catches a literal question mark', () => {
    expect(noteAsksAQuestion('Who told him to his face? Was it God?')).toBe(true);
  });

  it('catches a demand for reasoning with no question mark', () => {
    expect(noteAsksAQuestion('Then tell me why it got through.')).toBe(true);
    expect(noteAsksAQuestion('Explain why you chose that word.')).toBe(true);
  });

  it('catches "not sure why you chose"', () => {
    // Bart's exact phrasing about "caucused". This is a question wearing a
    // statement's clothes, and treating it as a directive is how it got ignored.
    expect(noteAsksAQuestion(`I'm not even sure why you chose to use it here?`)).toBe(true);
  });

  it('does not fire on a plain directive', () => {
    expect(noteAsksAQuestion('Change the header to "Four reigns, one line."')).toBe(false);
  });
});

describe('noteInvitesDebate', () => {
  it('catches an explicit invitation to disagree', () => {
    expect(noteInvitesDebate('If you disagree here, make your case.')).toBe(true);
  });

  it('does not fire on a plain directive', () => {
    expect(noteInvitesDebate('Fix the line.')).toBe(false);
  });
});

describe('classifyNote', () => {
  it('never batches a small edit that carries a question', () => {
    // The correction that produced this module. My first design batched word
    // swaps to save round trips. Bart: "some of those I asked for explanation
    // as to why the words were chosen... sometimes the point of asking why is
    // because there may be a reason a word was chosen that I didn't already
    // understand." Size of the edit is not the test.
    const wordSwapWithQuestion = classifyNote(
      `I would never say the word "caucused." I'm not even sure why you chose to use it here?`
    );
    expect(wordSwapWithQuestion.needsDialogue).toBe(true);
  });

  it('allows a pure directive to be applied without discussion', () => {
    expect(classifyNote('Change the header to "Four reigns, one line."').needsDialogue).toBe(false);
  });
});

describe('buildQueue', () => {
  const queue = buildQueue(REAL_NOTES, { draftSlug: 'the-cain-archetype' });

  it('keeps every note', () => {
    // The one silent failure this design can have is parsing nine notes into
    // six, which looks exactly like success.
    expect(queue.notes).toHaveLength(9);
  });

  it('flags every note that asked for an answer', () => {
    const needing = queue.notes.filter((n) => n.needsDialogue).map((n) => n.id);
    // Notes 3, 5, 6 and 7 all ask something or invite disagreement.
    expect(needing).toEqual(expect.arrayContaining([3, 5, 6, 7]));
  });

  it('starts every note pending', () => {
    expect(queue.notes.every((n) => n.status === 'pending')).toBe(true);
  });

  it('drops empty entries without renumbering into a gap', () => {
    const q = buildQueue(['first', '   ', 'second']);
    expect(q.notes.map((n) => n.id)).toEqual([1, 2]);
  });
});

describe('working the queue', () => {
  it('serves notes one at a time in order', () => {
    let q = buildQueue(REAL_NOTES);
    expect(nextNote(q).id).toBe(1);
    q = resolveNote(q, 1, 'agreed', 'rewrite in his register');
    expect(nextNote(q).id).toBe(2);
  });

  it('does not mutate the queue it was given', () => {
    const q = buildQueue(['a', 'b']);
    resolveNote(q, 1, 'agreed');
    expect(q.notes[0].status).toBe('pending');
  });

  it('reports progress', () => {
    let q = buildQueue(['a', 'b', 'c']);
    q = resolveNote(q, 1, 'agreed');
    q = resolveNote(q, 2, 'declined');
    const p = queueProgress(q);
    expect(p).toMatchObject({ total: 3, agreed: 1, declined: 1, pending: 1, worked: false });
  });

  it('is worked once every note is settled, including declined ones', () => {
    let q = buildQueue(['a', 'b']);
    q = resolveNote(q, 1, 'agreed');
    q = resolveNote(q, 2, 'declined');
    expect(queueIsWorked(q)).toBe(true);
    expect(nextNote(q)).toBeNull();
  });

  it('rejects an unknown status rather than corrupting the queue', () => {
    const q = buildQueue(['a']);
    expect(() => resolveNote(q, 1, 'done')).toThrow(/unknown status/i);
  });
});

describe('mayWrite', () => {
  it('blocks writing while notes are open', () => {
    const q = buildQueue(REAL_NOTES);
    const out = mayWrite(q);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('queue_open');
  });

  it('says how many unanswered questions are blocking', () => {
    const q = buildQueue(REAL_NOTES);
    expect(mayWrite(q).error).toMatch(/asked a question that has not been answered/i);
  });

  it('allows writing once every note is settled', () => {
    let q = buildQueue(['a', 'b']);
    q = resolveNote(q, 1, 'agreed');
    q = resolveNote(q, 2, 'agreed');
    expect(mayWrite(q).ok).toBe(true);
  });

  it('always yields to an explicit go-ahead', () => {
    // Bart is the final authority. "I don't care what you want, I want it my
    // way" overrules any rule here, including this one.
    const q = buildQueue(REAL_NOTES);
    expect(mayWrite(q, { explicitGoAhead: true }).ok).toBe(true);
  });

  it('does not block when there are no notes at all', () => {
    expect(mayWrite(buildQueue([])).ok).toBe(true);
  });
});

describe('summarizeQueue', () => {
  it('counts the notes out loud so a dropped one is visible', () => {
    const s = summarizeQueue(buildQueue(REAL_NOTES));
    expect(s).toMatch(/^9 notes/);
    expect(s).toMatch(/asking for an answer/);
  });

  it('marks which notes need an answer', () => {
    expect(summarizeQueue(buildQueue(REAL_NOTES))).toMatch(/\[needs answer\]/);
  });

  it('says so plainly when nothing parsed', () => {
    expect(summarizeQueue(buildQueue([]))).toMatch(/no notes found/i);
  });
});
