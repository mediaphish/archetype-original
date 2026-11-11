/**
 * Platform capability checks for social publishing.
 * Do not assume first-comment support everywhere; check before attempting.
 */

const FIRST_COMMENT_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'twitter'];

/**
 * Whether we implement and attempt first-comment publishing for this platform.
 * Instagram requires instagram_manage_comments; if the token lacks it, the API will fail and we set first_comment_status = 'failed'.
 * @param {string} platform - linkedin | facebook | instagram | twitter
 * @returns {boolean}
 */
export function supportsFirstComment(platform) {
  if (!platform || typeof platform !== 'string') return false;
  return FIRST_COMMENT_PLATFORMS.includes(platform.toLowerCase());
}

/**
 * Platforms where a first comment cannot post from here, so the comment goes
 * at the bottom of the post itself (Bart, 2026-11-11, "Build the guard": LinkedIn
 * comments need an approval we do not have, and every one failed unseen).
 */
const COMMENT_IN_POST_PLATFORMS = ['linkedin'];
export function commentGoesInPost(platform) {
  return COMMENT_IN_POST_PLATFORMS.includes(String(platform || '').toLowerCase());
}

/** Pure: the post text with the comment added at the bottom, once. */
export function withCommentInPost(text, comment) {
  const body = String(text || '').trimEnd();
  const add = String(comment || '').trim();
  if (!add || body.includes(add)) return body;
  return `${body}\n\n${add}`;
}
