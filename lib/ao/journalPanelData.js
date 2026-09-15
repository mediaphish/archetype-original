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

  const fromMarkdown = extractCaptionTextsFromMarkdown(text);
  for (const key of MANUAL_KEYS) {
    if (!out[key] && fromMarkdown[key]) out[key] = fromMarkdown[key];
  }

  return out;
}

/**
 * One entry per channel, in display order, with its text and where it came from.
 */
export function buildCaptionsPanel({ scheduledRows = [], captionsDraftContent = '', approvedCaptions = {} } = {}) {
  const rows = Array.isArray(scheduledRows) ? scheduledRows : [];
  const manual = extractManualCaptionTexts(captionsDraftContent);
  // The set Bart approved in the panel (metadata.approved_captions). Once
  // approved, that is the caption, ahead of any draft or chat text.
  const approved = approvedCaptions && typeof approvedCaptions === 'object' ? approvedCaptions : {};

  return DISPLAY.map((ch) => {
    const isManual = MANUAL_KEYS.has(ch.key);
    let text = null;
    let source = null;
    const approvedText = String(approved[ch.key] || '').trim();
    if (isManual) {
      if (approvedText) {
        text = approvedText;
        source = 'approved';
      } else {
        text = manual[ch.key] || null;
        source = text ? 'captions_draft' : null;
      }
    } else {
      // Scheduled text is what will actually post, so it wins even over an
      // approval. Approved text is next.
      const row = rows.find((r) => rowKey(r) === ch.key);
      const rowText = String(row?.caption || row?.text || '').trim();
      if (rowText) {
        text = rowText;
        source = 'scheduled';
      } else if (approvedText) {
        text = approvedText;
        source = 'approved';
      }
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

/**
 * How Auto actually labels each channel in a bold header.
 *
 * Measured on "Your Tuesday", 2026-09-15, where the captions existed only in a
 * chat message: "**LinkedIn Personal:**", "**LinkedIn Business (manual
 * paste):**", "**X:**". The Cain draft wrote "**LinkedIn Business:**". A trailing
 * parenthetical and a colon inside or outside the bold are all accepted.
 */
const CHANNEL_HEADER_ALIASES = {
  linkedin_personal: ['LinkedIn Personal'],
  linkedin_business: ['LinkedIn Business'],
  facebook_business: ['Facebook Business'],
  facebook_personal: ['Facebook Personal'],
  instagram_business: ['Instagram Business'],
  instagram_personal: ['Instagram Personal'],
  twitter: ['X', 'Twitter'],
};

function headerRegexFor(alias) {
  const a = alias.replace(/\s+/g, '\\s+');
  return new RegExp(`^\\s*\\*\\*\\s*${a}\\s*(?:\\([^)]*\\))?\\s*:?\\s*\\*\\*\\s*:?\\s*$`, 'i');
}

/** Any line that is only a bold label. Ends a caption section. */
const ANY_BOLD_LINE = /^\s*\*\*[^*\n]+\*\*\s*:?\s*$/;

/**
 * Every channel's caption from bold-header markdown.
 *
 * A section ends at the next bold-only line ("**Recommended times...:**" ends a
 * section without being mistaken for a channel). If the section has hashtag
 * lines it ends after the last one, so a closing question to Bart such as "Want
 * me to schedule these..." is never treated as caption text.
 *
 * @returns {Record<string, string>}
 */
export function extractCaptionTextsFromMarkdown(body) {
  const lines = String(body || '').split('\n');
  const out = {};
  for (const [key, aliases] of Object.entries(CHANNEL_HEADER_ALIASES)) {
    const patterns = aliases.map(headerRegexFor);
    const start = lines.findIndex((l) => patterns.some((re) => re.test(l)));
    if (start < 0) continue;

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (ANY_BOLD_LINE.test(lines[i])) {
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
    if (caption) out[key] = caption;
  }
  return out;
}

/** Captions from a chat message, in either format. */
export function captionsFromChatText(chatText) {
  const text = String(chatText || '');
  if (!text.trim()) return {};
  const tagged = extractAllCaptionTextsByPlatform(text);
  const markdown = extractCaptionTextsFromMarkdown(text);
  const out = {};
  for (const ch of DISPLAY) {
    const t = String(tagged[ch.key] || markdown[ch.key] || '').trim();
    if (t) out[ch.key] = t;
  }
  return out;
}

/**
 * The latest assistant message holding captions for THIS post.
 *
 * A long thread can hold captions for several posts. The message must mention
 * this post's URL or title, so an earlier post's captions can never be shown
 * under the wrong one. Two recognised channels is the floor, so a passing
 * mention of LinkedIn does not count as a caption set.
 */
export function findChatCaptionsMessage(messages, { slug = null, title = null } = {}) {
  const list = Array.isArray(messages) ? messages : [];
  const slugNeedle = slug ? `/journal/${slug}` : null;
  const titleNeedle = title ? String(title).trim().toLowerCase() : null;
  for (const m of [...list].reverse()) {
    if (String(m?.role || '') !== 'assistant') continue;
    const content = String(m?.content || '');
    const lower = content.toLowerCase();
    const aboutThisPost =
      (slugNeedle && content.includes(slugNeedle)) || (titleNeedle && titleNeedle.length > 3 && lower.includes(titleNeedle));
    if (!aboutThisPost) continue;
    if (Object.keys(captionsFromChatText(content)).length >= 2) return content;
  }
  return null;
}

/**
 * Fill channels that have no saved or scheduled caption from the chat.
 *
 * Saved and scheduled text always wins: it is what will actually post. Chat text
 * only fills a gap, and is marked source "chat" so the panel can say it is not
 * scheduled yet.
 */
export function mergeChatCaptions(captions, chatText) {
  const base = Array.isArray(captions) && captions.length ? captions : buildCaptionsPanel({});
  const chat = captionsFromChatText(chatText);
  if (!Object.keys(chat).length) return base;
  return base.map((c) =>
    c.text || !chat[c.key]
      ? c
      : { ...c, text: chat[c.key], chars: Array.from(chat[c.key]).length, source: 'chat' }
  );
}
