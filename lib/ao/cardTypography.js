/**
 * Typography rules for quote cards. Pure text logic, no IO, so the rules can be
 * tested without a database client.
 */

/**
 * Bebas Neue is the card display face and has no lowercase.
 *
 * Bart: "Bebas should only be used for these quotes. Short sections of text.
 * Never a huge block." A long passage in it becomes an unbroken wall of
 * capitals — legible per glyph, unreadable as prose.
 *
 * Enforced in code rather than left to whoever writes the card spec, because
 * Auto writes most of them unattended and a rule that depends on remembering
 * is a rule that eventually gets forgotten.
 */
export const BEBAS_MAX_WORDS = 14;
export const BEBAS_MAX_CHARS = 90;

export function isTooLongForDisplayFace(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  return t.length > BEBAS_MAX_CHARS || t.split(/\s+/).filter(Boolean).length > BEBAS_MAX_WORDS;
}
