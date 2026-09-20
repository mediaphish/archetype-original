/**
 * An [ARTIFACT] block that says "(same content as above)" instead of the post.
 *
 * 2026-09-20, "The Org Chart Only Works Until It's Tested": after an editorial
 * pass Auto wrote the full corrected draft into the chat, then closed with
 *
 *   [ARTIFACT type="draft" label="..." slug="..."]
 *   (same content as above)
 *   [/ARTIFACT]
 *
 * The panel renders the artifact body, so Bart's Post tab showed "(same content
 * as above)" and a word count of 4, with the edits he had just approved nowhere
 * in it. The real 1,274-word draft was saved correctly; only the block was a
 * placeholder. Bart: "There is no content above. It should never say this.
 * There were edits made to the post. It should know that."
 *
 * Pure string helpers, used by the server to repair the block from the saved
 * draft and by the panel to fall back to the draft it already fetched.
 */

const ARTIFACT_OPEN = /\[ARTIFACT\b[^\]]*\]/i;
const ARTIFACT_BLOCK = /(\[ARTIFACT\b[^\]]*\])([\s\S]*?)(\[\/ARTIFACT\])/i;

/** Phrases Auto uses in place of the draft body. */
const PLACEHOLDER_PHRASES =
  /\b(?:same (?:content|text|draft|as)\b[^.\n]{0,30}\babove|unchanged from above|as (?:written|shown) above|see above|content omitted|full (?:draft|text) above|no changes from above)\b/i;

/**
 * Is this artifact body a stand-in rather than the post?
 *
 * A real draft is long and has structure. A placeholder is a single short line,
 * usually parenthesised. Kept deliberately narrow: only short bodies qualify, so
 * a genuine short devotional can never be mistaken for one.
 */
export function isPlaceholderArtifactBody(body) {
  const text = String(body || '').trim().replace(/^\(|\)$/g, '').trim();
  if (!text) return true;
  if (text.length > 300) return false;
  if (PLACEHOLDER_PHRASES.test(text)) return true;
  // A one-line body with no markdown structure is not a post either.
  return text.length < 80 && !/\n/.test(text) && !/^#/.test(text);
}

/** The body between the tags, or null when there is no artifact block. */
export function extractArtifactBody(reply) {
  const match = String(reply || '').match(ARTIFACT_BLOCK);
  return match ? match[2].replace(/^\n+|\n+$/g, '') : null;
}

/** True when the reply carries an artifact block whose body is a placeholder. */
export function hasPlaceholderArtifact(reply) {
  if (!ARTIFACT_OPEN.test(String(reply || ''))) return false;
  const body = extractArtifactBody(reply);
  return body === null ? false : isPlaceholderArtifactBody(body);
}

/**
 * Put the real draft into the existing artifact block, keeping its tag (type,
 * label and slug) exactly as written.
 */
export function replaceArtifactBody(reply, content) {
  const text = String(reply || '');
  const body = String(content || '').trim();
  if (!body || !ARTIFACT_BLOCK.test(text)) return text;
  return text.replace(ARTIFACT_BLOCK, (_m, open, _old, close) => `${open}\n${body}\n${close}`);
}

/** The slug on the artifact tag, when it has one. */
export function artifactTagSlug(reply) {
  const match = String(reply || '').match(/\[ARTIFACT\b[^\]]*\bslug="([^"]+)"/i);
  return match ? match[1].trim() : null;
}
