/**
 * POST /api/ao/auto/schedule-cards
 *
 * Writes approved Auto quote cards to ao_scheduled_posts.
 *
 * Channels: LinkedIn Personal, LinkedIn Business, Instagram Business,
 * Facebook Business, X — 5 rows per card.
 *
 * Scheduling rules:
 * - Each card set shares one calendar date (all 5 platform rows same day)
 * - Cards spaced 3 weekdays apart from each other
 * - Reads existing queue to find next available slot (gap-aware)
 * - Never schedules on Saturday or Sunday
 * - Platform times: LinkedIn 15:00 UTC, Instagram 16:00 UTC, Facebook 18:00 UTC, X 14:00 UTC
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { findNextQueueDate, addWeekdays, toScheduledAt } from '../../../lib/ao/unifiedScheduler.js';

// All 5 approved channels — X now included
const APPROVED_CHANNELS = [
  { platform: 'linkedin',  account_id: 'personal', label: 'linkedin_personal' },
  { platform: 'linkedin',  account_id: 'personal', label: 'linkedin_business' },
  { platform: 'instagram', account_id: 'meta',     label: 'instagram_business' },
  { platform: 'facebook',  account_id: 'meta',     label: 'facebook_business' },
  { platform: 'twitter',   account_id: 'personal', label: 'x' },
];

// Date logic now lives in lib/ao/unifiedScheduler.js, shared with every
// other content type (journal launches, ideas). This file no longer
// duplicates its own weekday/gap logic.

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
    const cardNum = Number(card.card_index) || 1;
    const line1 = card.line1 || '';
    const line2 = card.line2 || '';
    const caption = card.caption || '';
    if (!caption) {
      console.warn(`[schedule-cards] Card ${cardNum} has no caption — scheduling with empty caption`);
    }
    const imageUrl = String(card.image_url || '').trim();
    const cardText = [line1, line2].filter(Boolean).join('\n').trim();
    const textBody = cardText || caption || `Quote card ${cardNum}`;

    // All 5 channels share the same calendar date, different platform times
    for (const ch of APPROVED_CHANNELS) {
      rows.push({
        platform: ch.platform,
        account_id: ch.account_id,
        scheduled_at: await toScheduledAt(currentDate, ch.platform),
        text: textBody,
        image_url: imageUrl || null,
        caption: card.caption || '',
        status: 'scheduled',
        source_kind: 'auto_quote_card',
        intent: {
          auto_hub: true,
          card_index: cardNum,
          channel_label: ch.label,
          created_by_email: auth.email,
          thread_id: thread_id || null,
        },
      });
    }

    // Next card is 3 weekdays after this one
    currentDate = addWeekdays(currentDate, 3);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert(rows)
      .select('id, platform, scheduled_at, status');

    if (error) {
      console.error('[schedule-cards]', error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      scheduled: data || [],
      total: (data || []).length,
      first_card_date: rows[0]?.scheduled_at || null,
      cards_scheduled: sortedCards.length,
      channels_per_card: APPROVED_CHANNELS.length,
    });
  } catch (err) {
    console.error('[schedule-cards]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
