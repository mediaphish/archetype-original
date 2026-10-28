/**
 * A question that reaches Bart's #queue has to make sense on its own (2026-10-28).
 *
 * Bart, on two queue items: "When I click on either of these they take me to
 * the Automated posts chat. But there is no context. I don't even see the
 * messages they are asking for a response to. What is A to D?" Both questions
 * leaned on the team's shorthand ("A to D", a saved draft's name, "the 16").
 */

/** Pure: why this question would not stand on its own, or null if it does. */
export function questionProblem(question) {
  const q = String(question || '');
  if (/\b[A-H]\s+(?:to|through)\s+[A-H]\b/.test(q) || /\b[A-H]\s*[-–]\s*[A-H]\b/.test(q) || /\bcards?\s+[A-H]\b/i.test(q)) {
    return 'it uses the team\'s card letters (A to D); name each card by its quote or post title';
  }
  if (/\b[a-z0-9]+(?:-[a-z0-9]+){3,}\b/.test(q)) return 'it names a saved file or slug; say what it is in plain words';
  if (/\b(task|draft|row|slug|tool|verify_quote|query_state|fetch_full_text)\b/i.test(q)) return 'it talks about the team\'s tools or records; ask about the work itself';
  if (q.length < 40) return 'it is too short to stand on its own';
  return null;
}

export const QUESTION_RULE =
  'Bart sees this question alone in #queue, away from the chat. It must make sense with nothing else: name the post or card by its title or quote, say what each answer would do, and never use the team\'s labels (card letters like A to D), file or slug names, or tool names.';
