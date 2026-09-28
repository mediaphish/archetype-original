/**
 * What Archy says when a question is genuinely not his.
 *
 * Lifted out of api/chat.js on 2026-09-28 for two reasons.
 *
 * Four of the twenty carried em dashes, and because these lines are returned
 * directly rather than generated, they never passed through the output guard in
 * lib/ao/archyVoice.js. They were the one place on the site where the dash rule
 * could not be enforced by cleaning a model's reply. They are clean here.
 *
 * And scripts/eval-archy.mjs has to know a decline when it sees one. Matching
 * these by a regex written from memory is how the suite's first run reported
 * two controls as failures when Archy had declined exactly as designed.
 */

export const OFF_TOPIC_REPLIES = [
  "You know, that's a good question for a different AI. If you'd like to get back on topic, I'm here for it. If not, let's part friends.",
  "I appreciate the creativity, but I'm focused on leadership, culture, and building things that last. Want to talk about that instead?",
  "That's... quite a question. I'm more of a leadership and culture kind of AI. If you want to explore those topics, I'm all in.",
  "I think you might have me confused with a different AI. I'm here to talk about leadership, teams, and building healthy organizations. Interested?",
  "That's outside my wheelhouse. I'm here for leadership, culture, and helping people build what matters. Want to try again?",
  "I'm going to be honest, that's not really my thing. But if you want to talk about leadership, teams, or building something real, I'm your AI.",
  "That's a fascinating question, but probably better suited for a physics or coffee AI. I'm here for leadership and culture. Want to pivot?",
  "I'm not the right AI for that one. But if you're interested in leadership, building teams, or creating healthy cultures, I'm all ears.",
  "That's creative, but I'm focused on leadership and organizational health. If you want to explore those topics, let's do it.",
  "I think we might be on different wavelengths. I'm here to help with leadership, culture, and building things that last. Want to give that a shot?",
  "That's not really my area of expertise. I'm more about leadership, teams, and helping people build what matters. Interested?",
  "I appreciate the curveball, but I'm here for leadership and culture conversations. If you want to explore those, I'm ready.",
  "That's a question for another time, and another AI. I'm here for leadership, culture, and building healthy organizations. Want to talk about that?",
  "I'm going to pass on that one. But if you want to discuss leadership, building teams, or creating cultures people actually want to belong to, I'm here.",
  "That's outside my scope. I'm focused on leadership, organizational health, and helping people build what lasts. Want to try a different question?",
  "I think you might be testing me. That's fine, but I'm here for real conversations about leadership and culture. Want to have one?",
  "That's not my thing, but I respect the creativity. If you want to talk about leadership, teams, or building something meaningful, I'm all in.",
  "I'm going to be straight with you, that's not what I do. But leadership, culture, and building healthy organizations? That's my jam.",
  "That's a question for a different AI entirely. I'm here for leadership and culture. If you want to explore those, let's go.",
  "I appreciate the originality, but I'm focused on leadership, teams, and organizational health. Want to talk about that instead?",
];

/** One at random, the way the route has always picked. */
export function randomOffTopicReply() {
  return OFF_TOPIC_REPLIES[Math.floor(Math.random() * OFF_TOPIC_REPLIES.length)];
}

/** The line Archy uses when it knows the topic but cannot answer the question. */
export const CANNOT_ANSWER_REPLY =
  "Hey, that's a great question, but I'm having trouble answering it. Can I get your contact information, so I can go talk to Bart and see what his thoughts are?";

/** Did Archy decline, by either route? */
export function isDecline(text) {
  const answer = String(text || '').trim();
  if (!answer) return false;
  if (answer === CANNOT_ANSWER_REPLY) return true;
  if (/having trouble answering it|can I get your contact information/i.test(answer)) return true;
  return OFF_TOPIC_REPLIES.includes(answer);
}
