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
import { getDefaultLogoUrl } from './brandLogos.js';
import { inlineLogoForQuoteCardSvg } from './remoteAssetDataUrl.js';
import { uploadMinimalQuoteCardToPublicUrl, uploadQuoteCardSvgToPublicUrl } from './quoteCardImageUrl.js';
import { insertScheduledPostsSafely } from '../db/scheduledPosts.js';
import { slotsSkippingWeekends } from './postingCadence.js';

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
  const tail = [title, url].filter(Boolean).join(' · ');
  let body = [cap, tail].filter(Boolean).join('\n\n').trim();
  if (!body) body = '—';
  if (platform === 'twitter') {
    body = body.slice(0, 280);
  } else {
    body = body.slice(0, 2200);
  }
  return body;
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
    const items = Array.isArray(bundle?.items) ? bundle.items : [];
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

    const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
    const bundleLogoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;

    const rows = [];
    const slots = slotsSkippingWeekends(start, items.length, gapDays);
    for (let i = 0; i < items.length; i += 1) {
      const when = slots[i];
      const item = items[i];
      let imageUrl = String(item.quote_card_image_url || '').trim();
      if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
        imageUrl = '';
      }
      const svg = String(item.quote_card_svg || '').trim();
      const qtext = String(item.quote || '').trim();
      if (!imageUrl && qtext) {
        const up = await uploadMinimalQuoteCardToPublicUrl(
          { quote: qtext, sourceName: item.source_title || '', logoUrl: bundleLogoUrl },
          { subfolder: 'weekly-pull-quote-cards' }
        );
        if (up.ok) imageUrl = up.publicUrl;
      }
      if (!imageUrl && svg) {
        const up = await uploadQuoteCardSvgToPublicUrl(svg, { subfolder: 'weekly-pull-quote-cards' });
        if (!up.ok) {
          return withStatus(500, { ok: false, error: up.error || 'Could not create image for quote card' });
        }
        imageUrl = up.publicUrl;
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
