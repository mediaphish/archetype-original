/**
 * POST /api/ao/auto/schedule-cards
 *
 * Writes approved Auto quote cards to ao_scheduled_posts.
 *
 * Channels: LinkedIn Personal, Instagram Business,
 * Facebook Business, X — 4 rows per card.
 *
 * Scheduling rules:
 * - Each card set shares one calendar date (all 4 platform rows same day)
 * - Cards spaced 3 weekdays apart from each other
 * - Reads existing queue to find next available slot (gap-aware)
 * - Never schedules on Saturday or Sunday
 * - Platform times: LinkedIn 15:00 UTC, Instagram 16:00 UTC, Facebook 18:00 UTC, X 14:00 UTC
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { findNextQueueDate, addWeekdays, toScheduledAt } from '../../../lib/ao/unifiedScheduler.js';
import { resolveQuoteCardScheduleCopy } from '../../../lib/ao/scheduledPostCopy.js';
import { insertScheduledPostsSafely } from '../../../lib/social/scheduledPostIntegrity.js';

// LINKEDIN BUSINESS — EXCLUDED FROM AUTOMATED QUEUE
// Requires Community Management API via second LinkedIn developer app ("AO Page Publisher").
// App is pending LinkedIn review as of July 2026.
// Do not re-enable until: (1) LinkedIn approves the app, (2) cursor-prompt-linkedin-business-enable.md is executed.
// When re-enabled: account_id must be set to 'page', token path must use ao_linkedin_tokens.page_urn.
// Auto still generates LinkedIn Business captions in chat for manual paste. Only the queue row is excluded.
// All 4 approved automated channels — X included
const APPROVED_CHANNELS = [
  { platform: 'linkedin',  account_id: 'personal', label: 'linkedin_personal' },
  { platform: 'instagram', account_id: 'meta',     label: 'instagram_business' },
  { platform: 'facebook',  account_id: 'meta',     label: 'facebook_business' },
  { platform: 'twitter',   account_id: 'personal', label: 'x' },
];

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { cards, thread_id } = req.body || {};

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ ok: false, error: 'cards array is required' });
  }

  const sortedCards = [...cards].sort((a, b) => (Number(a.card_index) || 0) - (Number(b.card_index) || 0));

  // Find the next available date from the live queue (shared across all content types)
  let currentDate = await findNextQueueDate(3);

  const rows = [];

  for (const card of sortedCards) {
    const resolved = resolveQuoteCardScheduleCopy(card);
    if (!resolved.ok) {
      console.error(`[schedule-cards] ${resolved.error}`);
      return res.status(400).json({
        ok: false,
        error: resolved.error,
        card_index: resolved.card_index,
      });
    }

    const imageUrl = String(card.image_url || '').trim();

    for (const ch of APPROVED_CHANNELS) {
      rows.push({
        platform: ch.platform,
        account_id: ch.account_id,
        scheduled_at: await toScheduledAt(currentDate, ch.platform),
        text: resolved.text,
        image_url: imageUrl || null,
        caption: resolved.caption,
        status: 'scheduled',
        source_kind: 'auto_quote_card',
        intent: {
          auto_hub: true,
          card_index: resolved.card_index,
          channel_label: ch.label,
          created_by_email: auth.email,
          thread_id: thread_id || null,
          line1: resolved.line1 || null,
          line2: resolved.line2 || null,
          card_text: resolved.cardText || null,
        },
      });
    }

    // Next card is 3 weekdays after this one
    currentDate = addWeekdays(currentDate, 3);
  }

  try {
    const result = await insertScheduledPostsSafely(rows, {
      select: 'id, platform, scheduled_at, status',
    });

    if (!result.ok) {
      console.error('[schedule-cards]', result.error);
      return res.status(result.rejected?.length ? 400 : 500).json({
        ok: false,
        error: result.error,
        rejected: result.rejected || [],
      });
    }

    return res.status(200).json({
      ok: true,
      scheduled: result.inserted || [],
      total: (result.inserted || []).length,
      rejected: result.rejected || [],
      integrity_summary: result.integrity_summary,
      first_card_date: rows[0]?.scheduled_at || null,
      cards_scheduled: sortedCards.length,
      channels_per_card: APPROVED_CHANNELS.length,
    });
  } catch (err) {
    console.error('[schedule-cards]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
