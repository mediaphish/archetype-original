/**
 * Parse [SOCIAL_CAPTIONS] for journal launch scheduling.
 *
 * Never voids well-formed captions because other channels are missing.
 * Returns every good row plus explicit missing/blank channel lists.
 */

/** Automated queue channels (linkedin_business is manual-only and excluded). */
export const JOURNAL_LAUNCH_REQUIRED_CHANNELS = [
  { key: 'linkedin_personal', platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal' },
  { key: 'instagram_business', platform: 'instagram', account_id: 'meta', label: 'instagram_business' },
  { key: 'facebook_business', platform: 'facebook', account_id: 'meta', label: 'facebook_business' },
  { key: 'twitter', platform: 'twitter', account_id: 'personal', label: 'x' },
];

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

  return {
    rows,
    missingChannels: extracted.missingChannels,
    blankChannels: extracted.blankChannels,
    requiredCount,
    foundCount: rows.length,
    hasBlock: true,
    incomplete: problems.length > 0,
    problems,
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
