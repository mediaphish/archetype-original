/**
 * Schedule one weekly corpus pull bundle: an image card and caption per quote,
 * on every channel, at Bart's cadence (every three working days, never a
 * weekend). Shared by the Review screen's "Schedule week" button and, since
 * 2026-10-24, by the Monday job that runs on its own.
 *
 * Bart, 2026-10-24: "Just let them run. You have my voice. If we focus on real
 * servant leadership quotes, we'll be just fine."
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { publishPlateCard } from './publishPlateCard.js';
import { isPlateCardUrl } from './generatePlateCard.js';

export { isPlateCardUrl };
import { accentClosingWords } from './buildWeeklyCorpusPullBundle.js';
import { insertScheduledPostsSafely } from '../db/scheduledPosts.js';
import { slotsSkippingWeekends } from './postingCadence.js';
import { generatePullQuoteCaptionsForQuotes, shortenAtSentence } from './pullQuoteCaptions.js';
import { detectVoiceViolations } from './voiceGuardrails.js';

/** A caption that can go out under his name: present and clean of the banned phrases. */
export function captionIsUsable(text) {
  const t = String(text || '').trim();
  return Boolean(t) && detectVoiceViolations(t).length === 0;
}

/**
 * Every card needs a real caption before it is scheduled. Bundles built before
 * 2026-10-24 could carry the stand-in caption; those are written again here, and
 * if Claude still cannot write one the bundle is not scheduled at all.
 */
export async function ensureCardCaptions(items) {
  const missing = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !captionIsUsable(item.caption) || !captionIsUsable(item.caption_x));
  if (!missing.length) return { ok: true, items, rewritten: 0 };
  const out = await generatePullQuoteCaptionsForQuotes(missing.map(({ item }) => item));
  const next = items.slice();
  missing.forEach(({ item, i }, k) => {
    next[i] = { ...item, caption: out.captions[k] || '', caption_x: out.captions_x[k] || '' };
  });
  const ok = next.every((item) => captionIsUsable(item.caption) && captionIsUsable(item.caption_x));
  return { ok, items: next, rewritten: missing.length };
}

function withStatus(status, body) {
  return { status, ...body };
}

/**
 * Image shows the quote; caption text should interpret or enhance (never a quote fragment as a shortcut).
 * X uses caption_x when present—written for clarity in ~200 chars, not blind truncation of the long caption.
 */
export function buildCaptionForCardPost(item, platform) {
  const longCap = String(item.caption || '').trim();
  const xCap = String(item.caption_x || '').trim();
  const cap = platform === 'twitter' ? (xCap || longCap) : longCap;
  const title = String(item.source_title || '').trim();
  const url = String(item.url || '').trim();
  if (platform === 'twitter') return fitForX(cap, title, url);
  // Instagram does not make caption links clickable; it points to the link in bio (2026-10-26).
  const where = platform === 'instagram' ? (url ? 'link in bio' : '') : url;
  const tail = [title, where].filter(Boolean).join(' · ');
  return [cap, tail].filter(Boolean).join('\n\n').trim().slice(0, 2200);
}

/** X counts every link as 23 characters, whatever its length. */
const X_LIMIT = 280;
const X_LINK = 23;

/**
 * 2026-10-24. The X posts were cut at 280 characters straight through the
 * middle of a word and of the link ("archetypeori"). The link and title stay
 * whole; the caption gives way, at a sentence when it can.
 */
export function fitForX(cap, title, url) {
  const sep = '\n\n';
  const xLen = (s) => s.replace(/https?:\/\/\S+/g, 'x'.repeat(X_LINK)).length;
  let tail = [title, url].filter(Boolean).join(' · ');
  if (xLen(tail) > 120) tail = url;
  const room = X_LIMIT - (tail ? xLen(tail) + sep.length : 0);
  const body = shortenAtSentence(cap, room);
  return [body, tail].filter(Boolean).join(sep).trim();
}

/**
 * Weekdays only, counting the gap in calendar days and stepping over the
 * weekend when a slot lands on one.
 *
 * Bart, 2026-10-02: "Quotes are every 3 days skipping weekends." A plain
 * three-day step lands on a Saturday one time in three, and a card posted into
 * a dead weekend is a card wasted.
 */
export const BUNDLE_PLATFORMS = [
  { platform: 'instagram', account_id: 'meta' },
  // Bart, 2026-10-04: "All 5 channels that let us post via API."
  { platform: 'instagram', account_id: 'ig_mediaphish' },
  { platform: 'facebook', account_id: 'meta' },
  { platform: 'linkedin', account_id: 'personal' },
  { platform: 'twitter', account_id: 'personal' },
];


/** @returns {Promise<{status:number, ok:boolean, ...}>} */
export async function scheduleWeeklyBundleRow(row, { start, gapDays }) {
  const quoteId = row.id;
  try {
    const bundle = row?.studio_playbook?.weekly_corpus_pull;
    let items = Array.isArray(bundle?.items) ? bundle.items : [];
    if (!items.length) {
      return withStatus(400, { ok: false, error: 'Not a weekly corpus bundle or empty items' });
    }

    for (let j = 0; j < items.length; j += 1) {
      if (!String(items[j].quote_card_svg || '').trim()) {
        return withStatus(400, {
          ok: false,
          error: `Bundle item ${j + 1} has no quote card image. Regenerate the weekly bundle in Review.`,
        });
      }
    }

    const captioned = await ensureCardCaptions(items);
    if (!captioned.ok) {
      console.error(`[scheduleWeeklyBundle] captions could not be written for bundle ${quoteId}; not scheduled`);
      return withStatus(502, { ok: false, error: 'The captions could not be written this time, so nothing was scheduled. It will try again on the next run.' });
    }
    items = captioned.items;

    const rows = [];
    const slots = slotsSkippingWeekends(start, items.length, gapDays);
    for (let i = 0; i < items.length; i += 1) {
      const when = slots[i];
      const item = items[i];
      // Only a card on one of Bart's plates, carrying his real lockup, goes out
      // (2026-10-28). An older bundle's plain card is remade on a plate; if that
      // fails, nothing is scheduled rather than the plain card.
      let imageUrl = String(item.quote_card_image_url || '').trim();
      if (!isPlateCardUrl(imageUrl)) {
        const qtext = String(item.quote || '').trim();
        const card = qtext ? await publishPlateCard({ quote: accentClosingWords(qtext), attribution: 'Bart Paden' }) : { ok: false, error: 'no quote' };
        if (!card.ok) {
          return withStatus(500, { ok: false, error: `Could not set quote ${i + 1} on a plate: ${card.error}` });
        }
        imageUrl = card.image_url;
      }

      for (const ch of BUNDLE_PLATFORMS) {
        const text = buildCaptionForCardPost(item, ch.platform);
        if (!text) continue;
        rows.push({
          platform: ch.platform,
          account_id: ch.account_id,
          scheduled_at: when.toISOString(),
          text,
          image_url: imageUrl,
          first_comment: null,
          status: 'scheduled',
          source_kind: 'weekly_pull_bundle',
          source_quote_id: quoteId,
          intent: {
            weekly_pull: true,
            week_start: bundle.week_start || null,
            theme_query: bundle.theme_query || null,
            index: i + 1,
            why_it_matters: row.why_it_matters || null,
            ao_lane: row.ao_lane || null,
          },
          best_move: 'weekly_pull_bundle',
          why_it_matters: row.why_it_matters || null,
          ao_lane: row.ao_lane || null,
          topic_tags: Array.isArray(row.topic_tags) ? row.topic_tags : null,
        });
      }
    }

    if (!rows.length) return withStatus(400, { ok: false, error: 'Nothing to schedule' });

    const result = await insertScheduledPostsSafely(rows, {
      select: 'id, platform, scheduled_at, status',
      spread: true,
      allowMinimalFallback: true,
      stripForFallback: ({ source_kind, intent, best_move, why_it_matters, ao_lane, topic_tags, ...rest }) =>
        rest,
    });

    if (!result.ok) {
      return withStatus(result.rejected?.length ? 400 : 500, {
        ok: false,
        error: result.error || 'Insert failed',
        rejected: result.rejected || [],
      });
    }

    try {
      await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({
          status: 'cleared',
          next_stage: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);
    } catch (_) {}

    return withStatus(200, {
      ok: true,
      scheduled: result.inserted || [],
      rejected: result.rejected || [],
      integrity_summary: result.integrity_summary,
      message:
        'Queued with image + caption for Instagram, Facebook, LinkedIn, and X. Open Publisher to adjust times or text.',
    });
  } catch (e) {
    return withStatus(500, { ok: false, error: e.message || 'Error' });
  }
}
