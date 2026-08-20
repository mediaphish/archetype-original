/**
 * Conservative "is this a complete Direct Image brief" check. False negative
 * is fine (falls back to normal propose/wait); false positive is not (fires
 * a generation Bart didn't clearly ask for). Exported for a real selftest.
 */

const INTENT_TERMS = [
  'change',
  'make',
  'create',
  'generate',
  'put me',
  'room',
  'scene',
  'quote',
  "don't touch",
  'dont touch',
  "don't mess",
  'dont mess',
  'logo',
  'hoodie',
  'outfit',
  'wardrobe',
  'background',
  'setting',
  'pose',
  'crop',
  'wearing',
];

const MIN_LENGTH = 80;

export function isDirectImageBrief(userMessage, { hasAttachmentThisTurn } = {}) {
  if (!hasAttachmentThisTurn) return false;
  const text = String(userMessage || '').trim();
  if (text.length < MIN_LENGTH) return false;
  const lower = text.toLowerCase();
  const hits = INTENT_TERMS.filter((term) => lower.includes(term)).length;
  return hits >= 2;
}
