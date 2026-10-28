/**
 * Queue one finished quote card and its captions (2026-10-28).
 *
 * Bart clicked "Looks good, schedule them" and the team had no way to do it:
 * schedule_captions is for a journal post's launch, so the card sat in the
 * panel and the reply was "nothing is queued yet." This is the way.
 *
 * Everything his review used to catch is checked here instead:
 *   - the image is one of his clean plate cards with his real logo
 *   - the line is his own sentence, word for word, from a journal post or a
 *     book chapter, never a devotional (Bart, 2026-10-28: "I don't want the
 *     devotionals to go out as quote cards from me")
 *   - every automated channel has its own caption
 */
import { insertScheduledPostsSafely, scheduledPosts } from '../db/scheduledPosts.js';
import { isPlateCardUrl } from './generatePlateCard.js';
import { quoteIsBartsOwn } from './quoteSource.js';

export const CARD_CHANNELS = Object.freeze({
  linkedin_personal: { platform: 'linkedin', account_id: 'personal' },
  instagram_business: { platform: 'instagram', account_id: 'meta' },
  instagram_personal: { platform: 'instagram', account_id: 'ig_mediaphish' },
  facebook_business: { platform: 'facebook', account_id: 'meta' },
  twitter: { platform: 'twitter', account_id: 'personal' },
});

/** Pure: the rows for one card, or the reason it cannot be queued. */
export function quoteCardRows({ image_url, quote, scheduled_at, captions, title = null, source_slug = null, thread_id = null }, { now = Date.now() } = {}) {
  if (!isPlateCardUrl(image_url)) {
    return { ok: false, error: 'image_url must be a card made today or later on one of his clean plates (generate_plate_card), carrying his real logo.' };
  }
  const when = Date.parse(scheduled_at || '');
  if (!Number.isFinite(when) || when < now + 5 * 60000) return { ok: false, error: 'scheduled_at must be a date and time at least five minutes from now.' };
  const missing = Object.keys(CARD_CHANNELS).filter((k) => !String(captions?.[k] || '').trim());
  if (missing.length) return { ok: false, error: `Each automated channel needs its own caption. Missing: ${missing.join(', ')}.` };
  const rows = Object.entries(CARD_CHANNELS).map(([key, ch]) => ({
    platform: ch.platform,
    account_id: ch.account_id,
    scheduled_at: new Date(when).toISOString(),
    text: String(captions[key]).trim(),
    image_url,
    status: 'scheduled',
    source_kind: 'auto_quote_card',
    ao_lane: 'Quote cards',
    intent: { quote_card: true, quote: String(quote || '').trim(), title, source_slug, thread_id },
  }));
  return { ok: true, rows };
}

export async function scheduleQuoteCard(input) {
  const own = await quoteIsBartsOwn(input?.quote);
  if (!own.ok) return { ok: false, error: `Not queued: ${own.reason}.` };
  if (own.type === 'devotional') return { ok: false, error: 'Not queued: quote cards come from his journal posts and book chapters, never the devotionals.' };
  const built = quoteCardRows({ ...input, source_slug: input?.source_slug || own.slug });
  if (!built.ok) return built;
  // The same card twice is a mistake, not a second post.
  const { data: dupes } = await scheduledPosts().select('id').eq('image_url', input.image_url).in('status', ['scheduled', 'publishing', 'posted']).limit(1);
  if (dupes?.length) return { ok: false, error: 'This card is already queued or posted.' };
  const out = await insertScheduledPostsSafely(built.rows, { select: 'id, platform, account_id, scheduled_at, status' });
  if (!out.ok) return { ok: false, error: out.error || 'Nothing was queued.' };
  return { ok: true, scheduled: out.inserted, source: own.title || own.slug };
}

/** For the panel: where each card stands, by its image. */
export async function cardStatuses(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter((u) => /^https:\/\//.test(u)).slice(0, 20);
  if (!list.length) return {};
  const { data } = await scheduledPosts().select('image_url, status, scheduled_at').in('image_url', list).in('status', ['scheduled', 'publishing', 'posted', 'failed']);
  const out = {};
  for (const r of data || []) {
    const cur = out[r.image_url];
    if (!cur || r.scheduled_at < cur.scheduled_at) out[r.image_url] = { status: r.status, scheduled_at: r.scheduled_at };
  }
  return out;
}
