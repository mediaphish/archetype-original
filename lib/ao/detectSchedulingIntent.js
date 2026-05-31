/**
 * detectSchedulingIntent
 *
 * Returns true if the user message or recent thread context suggests
 * a scheduling decision needs to be made. Used to decide whether to
 * fetch live queue data before calling Auto.
 */

export function detectSchedulingIntent(userMessage, recentMessages = []) {
  const combined = [
    String(userMessage || ''),
    ...recentMessages.slice(-4).map((m) => String(m.content || '')),
  ]
    .join(' ')
    .toLowerCase();

  return (
    /\bschedul\b/.test(combined) ||
    /\bpublish\b/.test(combined) ||
    /\bqueue\b/.test(combined) ||
    /\bready to (go|post|publish|schedule)\b/.test(combined) ||
    /\bwhat.{0,20}(next|available|open)\b/.test(combined) ||
    /\bwhen.{0,20}(post|publish|schedule|go out)\b/.test(combined) ||
    /\b(approved|all approved)\b.{0,40}\b(schedule|publish|post)\b/.test(combined) ||
    /\b(schedule|publish|post)\b.{0,40}\b(approved|all approved)\b/.test(combined) ||
    /\bnext.{0,20}(slot|date|open|available)\b/.test(combined) ||
    /\bhow many.{0,20}(scheduled|queued|posts)\b/.test(combined) ||
    /\bfailed posts?\b/.test(combined) ||
    /\bqueue status\b/.test(combined)
  );
}
