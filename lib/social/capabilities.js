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
