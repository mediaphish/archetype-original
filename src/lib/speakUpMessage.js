/**
 * Browser copy of speakUpMessage in lib/ao/team/speakUp.js (a test holds the
 * two to the same text): what a teammate is asked when it is their turn.
 */
export function speakUpMessage({ name, note }) {
  return `[TEAM] ${name}, you have something to add to the answer above: ${note}. Add it in a few lines, as yourself. Do not repeat what was already said, and do not speak for anyone else.`;
}
