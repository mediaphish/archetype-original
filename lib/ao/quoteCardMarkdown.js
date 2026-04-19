/**
 * Quote cards are drawn as plain text (canvas/SVG), not Markdown. Strip common
 * Markdown bold wrappers so labels like **Power says:** render without asterisks.
 */

/**
 * @param {string} text
 * @returns {string}
 */
export function stripMarkdownBoldForCardDisplay(text) {
  let s = String(text ?? '');
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, (_, inner) => String(inner));
  s = s.replace(/\*\*/g, '');
  return s.trim();
}
