/**
 * What the Captions and Schedule & Publish tabs show for one journal post.
 *
 * Steps 4 and 5 of notes/AUTO_STAGED_WORKSPACE_SPEC.md, built early because the
 * empty tabs read as broken: on the Cain post the Captions tab showed a check
 * mark and "will show here" while five captions sat scheduled for the next day.
 *
 * WHERE CAPTION TEXT ACTUALLY LIVES, measured on the Cain post 2026-09-13.
 *
 *   Automated channels: only on the scheduled rows in ao_scheduled_posts. That
 *   text is what will post, so it is the only honest thing to show.
 *
 *   Manual channels (LinkedIn Business, Facebook Personal): only in the captions
 *   draft (ao_content_drafts, kind "captions", same slug). That draft is not a
 *   clean caption set. It mixes Auto's schedule summary, the two manual
 *   captions under bold markdown headers ("**LinkedIn Business:**"), and a
 *   closing sign-off. The existing parsers in parseJournalSocialCaptions.js only
 *   read [SOCIAL_CAPTIONS][CAPTION platform=...] tags and returned nothing for it.
 *
 * Pure. Takes rows, returns display data.
 */
import {
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
  JOURNAL_LAUNCH_MANUAL_CHANNELS,
  extractAllCaptionTextsByPlatform,
} from './parseJournalSocialCaptions.js';

/** Human labels, and the order a reader expects to scan channels in. */
const DISPLAY = [
  { key: 'linkedin_personal', label: 'LinkedIn Personal', platform: 'linkedin' },
  { key: 'linkedin_business', label: 'LinkedIn Business', platform: 'linkedin' },
  { key: 'facebook_business', label: 'Facebook Business', platform: 'facebook' },
  { key: 'facebook_personal', label: 'Facebook Personal', platform: 'facebook' },
  { key: 'instagram_business', label: 'Instagram Business', platform: 'instagram' },
  { key: 'instagram_personal', label: 'Instagram Personal', platform: 'instagram' },
  { key: 'twitter', label: 'X', platform: 'twitter' },
];

const MANUAL_KEYS = new Set(JOURNAL_LAUNCH_MANUAL_CHANNELS.map((c) => c.key));

/** Scheduled rows carry intent.channel_label, and X is stored as "x", not "twitter". */
const CHANNEL_LABEL_TO_KEY = Object.fromEntries(
  JOURNAL_LAUNCH_REQUIRED_CHANNELS.map((c) => [c.label, c.key])
);

function rowKey(row) {
  const label = String(row?.intent?.channel_label || row?.channel_label || '').trim().toLowerCase();
  return CHANNEL_LABEL_TO_KEY[label] || null;
}

/**
 * Manual captions from the captions draft.
 *
 * Tag format first, because that is the documented form. Then the bold header
 * form Auto actually wrote on the Cain post.
 *
 * A section ends at the next bold header. If it contains hashtag lines, it ends
 * after the last one: Auto appended "Everything is locked in for tomorrow" after
 * the Facebook Personal caption, and that sign-off must not be pasted to
 * Facebook as part of the post.
 *
 * @returns {Record<string, string>}
 */
export function extractManualCaptionTexts(body) {
  const text = String(body || '');
  const out = {};

  const tagged = extractAllCaptionTextsByPlatform(text);
  for (const key of MANUAL_KEYS) {
    if (tagged[key]) out[key] = tagged[key].trim();
  }

  const lines = text.split('\n');
  for (const ch of JOURNAL_LAUNCH_MANUAL_CHANNELS) {
    if (out[ch.key]) continue;
    const headerRe = new RegExp(`^\\s*\\*\\*\\s*${ch.label.replace(/\s+/g, '\\s+')}\\s*:?\\s*\\*\\*\\s*:?\\s*$`, 'i');
    const start = lines.findIndex((l) => headerRe.test(l));
    if (start < 0) continue;

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(lines[i])) {
        end = i;
        break;
      }
    }
    let section = lines.slice(start + 1, end);

    let lastHashtagLine = -1;
    section.forEach((l, i) => {
      if (/^\s*#\w/.test(l)) lastHashtagLine = i;
    });
    if (lastHashtagLine >= 0) section = section.slice(0, lastHashtagLine + 1);

    const caption = section.join('\n').trim();
    if (caption) out[ch.key] = caption;
  }

  return out;
}

/**
 * One entry per channel, in display order, with its text and where it came from.
 */
export function buildCaptionsPanel({ scheduledRows = [], captionsDraftContent = '' } = {}) {
  const rows = Array.isArray(scheduledRows) ? scheduledRows : [];
  const manual = extractManualCaptionTexts(captionsDraftContent);

  return DISPLAY.map((ch) => {
    const isManual = MANUAL_KEYS.has(ch.key);
    let text = null;
    let source = null;
    if (isManual) {
      text = manual[ch.key] || null;
      source = text ? 'captions_draft' : null;
    } else {
      const row = rows.find((r) => rowKey(r) === ch.key);
      const rowText = String(row?.caption || row?.text || '').trim();
      text = rowText || null;
      source = text ? 'scheduled' : null;
    }
    return {
      key: ch.key,
      label: ch.label,
      platform: ch.platform,
      manual: isManual,
      text,
      chars: text ? Array.from(text).length : 0,
      source,
    };
  });
}

/**
 * What goes out when, then what Bart still posts by hand.
 *
 * @param {object} args
 * @param {object} args.draft           The journal draft (scheduled_publish_at, image_url, published_at).
 * @param {Array}  args.scheduledRows   Caption rows for this post.
 * @param {object} args.manualPosts     draft.metadata.manual_posts: { [key]: { posted_at } }.
 * @param {Array}  args.captions        Output of buildCaptionsPanel, for the manual texts.
 */
export function buildSchedulePanel({ draft = null, scheduledRows = [], manualPosts = {}, captions = [] } = {}) {
  const rows = (Array.isArray(scheduledRows) ? scheduledRows : [])
    .map((r) => {
      const key = rowKey(r);
      const display = DISPLAY.find((d) => d.key === key);
      return {
        key,
        label: display?.label || String(r?.platform || 'Unknown'),
        platform: r?.platform || display?.platform || null,
        scheduledAt: r?.scheduled_at || null,
        status: r?.status || null,
        hasImage: Boolean(r?.image_url),
      };
    })
    .sort((a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || '')));

  const posts = manualPosts && typeof manualPosts === 'object' ? manualPosts : {};
  const manual = JOURNAL_LAUNCH_MANUAL_CHANNELS.map((ch) => {
    const caption = (captions || []).find((c) => c.key === ch.key);
    return {
      key: ch.key,
      label: ch.label,
      text: caption?.text || null,
      imageUrl: draft?.image_url || null,
      postedAt: posts[ch.key]?.posted_at || null,
    };
  });

  return {
    publishAt: draft?.scheduled_publish_at || null,
    publishedAt: draft?.published_at || null,
    rows,
    manual,
  };
}

/** Manual channel keys that "Mark as posted" accepts. */
export function isManualChannelKey(key) {
  return MANUAL_KEYS.has(String(key || ''));
}
