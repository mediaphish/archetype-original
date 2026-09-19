/**
 * @jest-environment node
 *
 * "not just X, it's Y" is the rhetorical construction the rule exists for.
 *
 * 2026-09-19: the rule flagged "Extend grace this week in a situation where it
 * will cost you something real, not just where it's convenient." and stopped
 * every deploy. Bart: "in context, that phrase is fine." The "it's" there
 * belongs to the same clause; it is not the pivot to a second one.
 */
import { VOICE_VIOLATIONS } from '../ao/voiceGuardrails.js';

const rule = VOICE_VIOLATIONS.find((p) => p.id === 'not-just-its');
const hits = (text) => {
  rule.pattern.lastIndex = 0;
  return rule.pattern.test(text);
};

describe('not-just-its', () => {
  it.each([
    "Leadership is not just a title, it's a responsibility.",
    "This is not just a tool; it's a mindset.",
    "It was not just about the quarter, it's about the next ten years.",
  ])('still flags the construction: %p', (text) => {
    expect(hits(text)).toBe(true);
  });

  it.each([
    "Extend grace this week in a situation where it will cost you something real, not just where it's convenient.",
    "Notice whether mercy shows up not just when it's easy.",
  ])('lets a plain use through: %p', (text) => {
    expect(hits(text)).toBe(false);
  });
});
