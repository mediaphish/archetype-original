/**
 * Maps (platform, account_id) to env variable names for tokens/credentials.
 * Used by channel adapters to resolve which token to use.
 */

const PLATFORMS = ['linkedin', 'facebook', 'instagram', 'twitter'];

/**
 * Get env key(s) for a given platform + account_id.
 * Returns an object with the keys the adapter needs (e.g. accessToken, pageId).
 * @param {string} platform - linkedin | facebook | instagram | twitter
 * @param {string} accountId - e.g. personal, page_1, group_1, ig_1
 * @returns {{ accessToken: string, [key: string]: string } | null} config or null if not configured
 */
export function getSocialCredentials(platform, accountId) {
  if (!PLATFORMS.includes(platform)) return null;

  if (platform === 'linkedin') {
    if (accountId === 'personal') {
      const token = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;
      if (!token) return null;
      return { accessToken: token, personUrn: personUrn || null };
    }
    // page_1, page_2, ...
    const match = accountId.match(/^page_(.+)$/);
    if (match) {
      const id = match[1];
      const token = process.env[`LINKEDIN_PAGE_${id.toUpperCase()}_ACCESS_TOKEN`] ?? process.env[`LINKEDIN_PAGE_${id}_ACCESS_TOKEN`];
      const urn = process.env[`LINKEDIN_PAGE_${id.toUpperCase()}_URN`] ?? process.env[`LINKEDIN_PAGE_${id}_URN`];
      if (!token) return null;
      return { accessToken: token, pageUrn: urn || null };
    }
    return null;
  }

  if (platform === 'facebook') {
    const matchPage = accountId.match(/^page_(.+)$/);
    const matchGroup = accountId.match(/^group_(.+)$/);
    if (matchPage) {
      const id = matchPage[1];
      const token = process.env[`FACEBOOK_PAGE_${id.toUpperCase()}_ACCESS_TOKEN`] ?? process.env[`FACEBOOK_PAGE_${id}_ACCESS_TOKEN`];
      const pageId = process.env[`FACEBOOK_PAGE_${id.toUpperCase()}_PAGE_ID`] ?? process.env[`FACEBOOK_PAGE_${id}_PAGE_ID`];
      if (!token || !pageId) return null;
      return { accessToken: token, pageId };
    }
    if (matchGroup) {
      const id = matchGroup[1];
      const token = process.env[`FACEBOOK_GROUP_${id.toUpperCase()}_ACCESS_TOKEN`] ?? process.env[`FACEBOOK_GROUP_${id}_ACCESS_TOKEN`];
      const groupId = process.env[`FACEBOOK_GROUP_${id.toUpperCase()}_GROUP_ID`] ?? process.env[`FACEBOOK_GROUP_${id}_GROUP_ID`];
      if (!token || !groupId) return null;
      return { accessToken: token, groupId };
    }
    return null;
  }

  if (platform === 'instagram') {
    // ig_1, ig_2 or account id as number
    const match = accountId.match(/^ig_(.+)$/) || (accountId.match(/^\d+$/) ? { 1: accountId } : null);
    if (match) {
      const n = match[1];
      const token = process.env[`INSTAGRAM_ACCOUNT_${n}_ACCESS_TOKEN`];
      const igUserId = process.env[`INSTAGRAM_ACCOUNT_${n}_IG_USER_ID`];
      if (!token || !igUserId) return null;
      return { accessToken: token, igUserId };
    }
    return null;
  }

  if (platform === 'twitter') {
    const token = process.env.TWITTER_ACCESS_TOKEN;
    const tokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    if (!apiKey || !apiSecret || !token || !tokenSecret) return null;
    return { apiKey, apiSecret, accessToken: token, accessTokenSecret: tokenSecret };
  }

  return null;
}

/**
 * Validate that platform and account_id are allowed and configured.
 */
export function validatePlatformAccount(platform, accountId) {
  if (!platform || !accountId) return { valid: false, error: 'platform and account_id are required' };
  if (!PLATFORMS.includes(platform)) return { valid: false, error: `Invalid platform: ${platform}` };
  const creds = getSocialCredentials(platform, accountId);
  if (!creds) return { valid: false, error: `No credentials configured for ${platform}/${accountId}` };
  return { valid: true };
}
