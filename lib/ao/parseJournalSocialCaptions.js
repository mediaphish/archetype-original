/**
 * Parse [SOCIAL_CAPTIONS] for journal launch scheduling.
 *
 * Never voids well-formed captions because other channels are missing.
 * Returns every good row plus explicit missing/blank channel lists.
 */

/** Automated queue channels (linkedin_business / facebook_personal stay manual-only). */
export const JOURNAL_LAUNCH_REQUIRED_CHANNELS = [
  { key: 'linkedin_personal', platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal' },
  { key: 'instagram_business', platform: 'instagram', account_id: 'meta', label: 'instagram_business' },
  { key: 'instagram_personal', platform: 'instagram', account_id: 'ig_mediaphish', label: 'instagram_personal' },
  { key: 'facebook_business', platform: 'facebook', account_id: 'meta', label: 'facebook_business' },
  { key: 'twitter', platform: 'twitter', account_id: 'personal', label: 'x' },
];

/** Manual paste-ready caption channels (not auto-posted). */
export const JOURNAL_LAUNCH_MANUAL_CHANNELS = [
  { key: 'linkedin_business', label: 'LinkedIn Business' },
  { key: 'facebook_personal', label: 'Facebook Personal' },
];

/**
 * Standard X/Twitter text limit for non-premium posts (confirmed against X API
 * public limit — not the older "240" prompt guidance).
 * Do not silently truncate; refuse and ask for a rewrite.
 */
export const TWITTER_CAPTION_MAX_CHARS = 280;

/**
 * Count caption length in Unicode code points (emoji-safe enough for a gate).
 * This is a conservative preflight — X also weights URLs; we still refuse oversized
 * raw captions rather than guessing t.co expansion.
 */
export function countCaptionChars(text) {
  return Array.from(String(text || '')).length;
}

/**
 * @returns {{ ok: true, count: number, limit: number } | { ok: false, count: number, limit: number, error: string }}
 */
export function validateTwitterCaptionLength(text) {
  const count = countCaptionChars(text);
  const limit = TWITTER_CAPTION_MAX_CHARS;
  if (count <= limit) return { ok: true, count, limit };
  return {
    ok: false,
    count,
    limit,
    error:
      `X/Twitter caption is ${count} characters; the limit is ${limit}. ` +
      `Shorten it and try again. Nothing was truncated automatically.`,
  };
}
/**
 * Sync extract of caption bodies by channel key (no scheduling side effects).
 * @returns {{
 *   hasBlock: boolean,
 *   found: Record<string, string>,
 *   missingChannels: string[],
 *   blankChannels: string[],
 * }}
 */
export function extractJournalSocialCaptionTexts(body) {
  const captionsMatch = String(body || '').match(
    /\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i
  );
  if (!captionsMatch) {
    return { hasBlock: false, found: {}, missingChannels: [], blankChannels: [] };
  }

  const captionsBlock = captionsMatch[1];
  const found = {};
  const missingChannels = [];
  const blankChannels = [];

  for (const ch of JOURNAL_LAUNCH_REQUIRED_CHANNELS) {
    const openTagPattern = new RegExp(`\\[CAPTION\\s+platform="${ch.key}"([^\\]]*)\\]`, 'i');
    const openMatch = captionsBlock.match(openTagPattern);
    if (!openMatch) {
      missingChannels.push(ch.key);
      continue;
    }

    const openTagEnd = captionsBlock.indexOf(openMatch[0]) + openMatch[0].length;
    const remaining = captionsBlock.slice(openTagEnd);
    const nextCaptionIdx = remaining.search(/\[CAPTION\s+platform=/i);
    const closingTagIdx = remaining.search(/\[\/CAPTION\]/i);
    const socialClosingIdx = remaining.search(/\[\/SOCIAL_CAPTIONS\]/i);
    const boundaries = [nextCaptionIdx, closingTagIdx, socialClosingIdx].filter((idx) => idx >= 0);
    const endIdx = boundaries.length > 0 ? Math.min(...boundaries) : remaining.length;
    let text = remaining.slice(0, endIdx).trim();

    if (!text) {
      blankChannels.push(ch.key);
      continue;
    }

    if (ch.platform === 'instagram') {
      text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (!text.includes('Link in bio')) {
        text = `${text}\n\nLink in bio.`;
      }
    }

    found[ch.key] = text;
  }

  return { hasBlock: true, found, missingChannels, blankChannels };
}

/**
 * Extract every [CAPTION platform="..."] body from a SOCIAL_CAPTIONS block,
 * including manual-only channels not in JOURNAL_LAUNCH_REQUIRED_CHANNELS.
 * @returns {Record<string, string>}
 */
export function extractAllCaptionTextsByPlatform(body) {
  const captionsMatch = String(body || '').match(
    /\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i
  );
  if (!captionsMatch) return {};

  const captionsBlock = captionsMatch[1];
  const found = {};
  const openRe = /\[CAPTION\s+platform="([^"]+)"[^\]]*\]/gi;
  let openMatch;
  while ((openMatch = openRe.exec(captionsBlock)) !== null) {
    const key = String(openMatch[1] || '')
      .trim()
      .toLowerCase();
    if (!key || found[key]) continue;
    const openTagEnd = openMatch.index + openMatch[0].length;
    const remaining = captionsBlock.slice(openTagEnd);
    const nextCaptionIdx = remaining.search(/\[CAPTION\s+platform=/i);
    const closingTagIdx = remaining.search(/\[\/CAPTION\]/i);
    const boundaries = [nextCaptionIdx, closingTagIdx].filter((idx) => idx >= 0);
    const endIdx = boundaries.length > 0 ? Math.min(...boundaries) : remaining.length;
    let text = remaining.slice(0, endIdx).trim();
    if (!text) continue;
    if (key.includes('instagram')) {
      text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      if (!text.includes('Link in bio')) {
        text = `${text}\n\nLink in bio.`;
      }
    }
    found[key] = text;
  }
  return found;
}

/**
 * Build schedule rows for well-formed captions only.
 * Does NOT throw when some required channels are missing.
 *
 * @returns {Promise<{
 *   rows: object[],
 *   missingChannels: string[],
 *   blankChannels: string[],
 *   requiredCount: number,
 *   foundCount: number,
 *   hasBlock: boolean,
 *   incomplete: boolean,
 *   problems: string[],
 * }>}
 */
export async function parseJournalSocialCaptions(body, slug, journalUrl, imageUrl = '') {
  const extracted = extractJournalSocialCaptionTexts(body);
  const requiredCount = JOURNAL_LAUNCH_REQUIRED_CHANNELS.length;

  if (!extracted.hasBlock) {
    return {
      rows: [],
      missingChannels: [],
      blankChannels: [],
      requiredCount,
      foundCount: 0,
      hasBlock: false,
      incomplete: false,
      problems: [],
    };
  }

  const trimmedImage = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  let safeImageUrl = null;
  if (trimmedImage.startsWith('https://') || trimmedImage.startsWith('http://')) {
    safeImageUrl = trimmedImage;
  } else if (trimmedImage.startsWith('/images/')) {
    const siteBase = (
      process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com'
    ).replace(/\/$/, '');
    safeImageUrl = `${siteBase}${trimmedImage}`;
  }

  const rows = [];
  for (const ch of JOURNAL_LAUNCH_REQUIRED_CHANNELS) {
    const text = extracted.found[ch.key];
    if (!text) continue;

    const captionsMatch = String(body || '').match(
      /\[SOCIAL_CAPTIONS\]([\s\S]*?)\[\/SOCIAL_CAPTIONS\]/i
    );
    const captionsBlock = captionsMatch?.[1] || '';
    const openTagPattern = new RegExp(`\\[CAPTION\\s+platform="${ch.key}"([^\\]]*)\\]`, 'i');
    const openMatch = captionsBlock.match(openTagPattern);
    const scheduledTimeMatch = openMatch?.[1]?.match(/scheduled_time="([^"]+)"/i);
    let scheduledAt = scheduledTimeMatch?.[1] || null;
    if (!scheduledAt) {
      // Lazy-load so pure extract/selftests do not require DB env at import time.
      const { toScheduledAt } = await import('./unifiedScheduler.js');
      scheduledAt = await toScheduledAt(new Date(), ch.platform);
    }

    rows.push({
      platform: ch.platform,
      account_id: ch.account_id,
      scheduled_at: scheduledAt,
      text,
      caption: text,
      image_url: safeImageUrl,
      status: 'scheduled',
      source_kind: 'journal_launch',
      intent: {
        auto_hub: true,
        channel_label: ch.label,
        journal_slug: slug,
        journal_url: journalUrl,
      },
    });
  }

  const problems = [];
  if (extracted.blankChannels.length > 0) {
    problems.push(`blank captions for: ${extracted.blankChannels.join(', ')}`);
  }
  if (extracted.missingChannels.length > 0) {
    problems.push(`no caption tag found at all for: ${extracted.missingChannels.join(', ')}`);
  }

  let twitterLengthError = null;
  const twitterText = extracted.found.twitter;
  if (twitterText) {
    const tw = validateTwitterCaptionLength(twitterText);
    if (!tw.ok) {
      twitterLengthError = tw.error;
      problems.push(tw.error);
      // Do not schedule an oversized X caption — drop the row if present.
      const idx = rows.findIndex((r) => r.platform === 'twitter');
      if (idx >= 0) rows.splice(idx, 1);
    }
  }

  return {
    rows,
    missingChannels: extracted.missingChannels,
    blankChannels: extracted.blankChannels,
    requiredCount,
    foundCount: rows.length,
    hasBlock: true,
    incomplete: problems.length > 0,
    problems,
    twitterLengthError,
    twitterOverLimit: Boolean(twitterLengthError),
  };
}

/**
 * Human-readable summary for API/UI when caption coverage is incomplete.
 */
export function buildCaptionsCoverageMessage({
  foundCount = 0,
  requiredCount = 4,
  missingChannels = [],
  blankChannels = [],
  scheduledCount = null,
}) {
  const incomplete = [...missingChannels, ...blankChannels];
  const scheduled =
    scheduledCount != null ? scheduledCount : foundCount;
  if (incomplete.length === 0) {
    return `Scheduled ${scheduled} of ${requiredCount} social posts.`;
  }
  return (
    `Scheduled ${scheduled} of ${requiredCount} social posts — missing captions for: ${incomplete.join(
      ', '
    )}. Ask Auto to write those and they'll get queued.`
  );
}
