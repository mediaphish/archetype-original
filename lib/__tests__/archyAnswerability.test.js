/**
 * @jest-environment node
 *
 * The regression these lock down was observed live on 2026-09-10, not imagined.
 * The same question asked twice thirty seconds apart returned the canned
 * handoff once and a real answer once, because the old rule discarded any
 * answer containing a refusal phrase anywhere in its text.
 *
 * The strings below are real responses from the production endpoint, trimmed.
 */
import { detectCannotAnswer } from '../ao/archyAnswerability.js';

// Real answer, opens by admitting a partial limit, then answers. Under the old
// rule this class of response was a coin flip.
const HEDGED_BUT_REAL =
  'I can answer the second part fully, but I need to be upfront about the first. ' +
  'On the framework itself I do not have a clean definition in what Bart has published, ' +
  'so I would rather not invent one. On the boundaries, though, he is explicit. ' +
  'Culture Science is built with deliberate limits. It explains conditions, not people. ' +
  'It does not tell you who is good or bad, who is trustworthy, who should be promoted ' +
  'or fired. It explains what people are operating inside: the pressures, the incentives, ' +
  'the unwritten rules that decide what behaviour is actually rewarded. That restraint is ' +
  'what makes it credible rather than another vague leadership framework, and it is the ' +
  'reason he is careful about what it claims to measure.';

const REAL_ANSWER =
  "Bart's take on this is pretty pointed: isolation in leadership is not usually an " +
  'accident, it is a strategy, even when the leader would not call it that. Narcissistic ' +
  'or insecure leaders create distance from their teams through layers, buffers, ' +
  'gatekeepers and indirect communication, and it often looks like professionalism or ' +
  'high level focus. Underneath, it is a defense mechanism. It insulates the leader from ' +
  'accountability, from truth, and from the emotional weight of their decisions. The signs ' +
  'show up clearly once you know to look for them.';

describe('a substantive answer is never discarded', () => {
  it('keeps an answer that opens by admitting a partial limit', () => {
    // The exact regression. This answer is useful and honest, and the old rule
    // threw it away for saying "I do not have".
    expect(detectCannotAnswer({ response: HEDGED_BUT_REAL }).cannotAnswer).toBe(false);
  });

  it('keeps a long answer even when retrieval looked weak', () => {
    // If Archy produced a real answer, the retrieval signal is already wrong.
    expect(
      detectCannotAnswer({ response: HEDGED_BUT_REAL, hasLowKnowledge: true }).cannotAnswer
    ).toBe(false);
  });

  it('keeps an ordinary answer with no hedging at all', () => {
    expect(detectCannotAnswer({ response: REAL_ANSWER }).cannotAnswer).toBe(false);
  });

  it('keeps an answer that hedges only at the very end', () => {
    const text = `${REAL_ANSWER} I am not sure how far he takes that beyond the journal.`;
    expect(detectCannotAnswer({ response: text }).cannotAnswer).toBe(false);
  });
});

describe('a genuine refusal is still caught', () => {
  it.each([
    ["I don't know that one. Bart has not written about it as far as I can find."],
    ["I'm not sure Bart has addressed that anywhere in his work."],
    ['I cannot answer that from what Bart has published.'],
    ["I do not have that information in my knowledge of his writing."],
  ])('%s', (response) => {
    expect(detectCannotAnswer({ response }).cannotAnswer).toBe(true);
  });

  it('catches a short hedged reply when retrieval also found nothing', () => {
    const response = 'That is a good question, though I am uncertain what Bart would say.';
    expect(detectCannotAnswer({ response, hasLowKnowledge: true }).cannotAnswer).toBe(true);
  });

  it('treats an empty response as a failure', () => {
    expect(detectCannotAnswer({ response: '' }).cannotAnswer).toBe(true);
    expect(detectCannotAnswer({}).cannotAnswer).toBe(true);
  });
});

describe('short answers that are not refusals survive', () => {
  it.each([
    ['Yes. He calls that the scoreboard problem.'],
    ['Servant leadership is the practice of carrying weight so others can do their work.'],
  ])('%s', (response) => {
    // Brevity is not failure. A short direct answer is often the best one.
    expect(detectCannotAnswer({ response }).cannotAnswer).toBe(false);
  });
});
