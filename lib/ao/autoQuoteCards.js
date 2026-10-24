/**
 * Quote cards that keep running on their own.
 *
 * Bart, 2026-10-24: "I need Quote Cards to start running again." Then: "Just
 * let them run. You have my voice. If we focus on real servant leadership
 * quotes, we'll be just fine."
 *
 * Each time the weekly job runs, it keeps about two weeks of cards queued:
 * if fewer than MIN_QUEUED_DAYS card days are already scheduled, it builds this
 * week's bundle from Bart's own published writing (servant leadership themes)
 * and schedules it straight onto every channel, continuing the stream every
 * three working days after the last card already queued. No review step; the
 * builder's own checks on the lines (voice, standing alone) still apply.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { scheduledPosts } from '../db/scheduledPosts.js';
import { seedWeeklyCorpusPullBundle } from './seedWeeklyCorpusPullBundle.js';
import { scheduleWeeklyBundleRow } from './scheduleWeeklyBundle.js';
import { addBusinessDays, nextWeekday, QUOTE_CARD_GAP_DAYS } from './postingCadence.js';

export const MIN_QUEUED_DAYS = 4;
const CARD_KINDS = ['weekly_pull_bundle', 'auto_quote_card'];

/** Distinct future days that already have a quote card scheduled, and the last one. */
export async function queuedCardDays(now = new Date()) {
  const { data, error } = await scheduledPosts()
    .select('scheduled_at, source_kind, status')
    .in('source_kind', CARD_KINDS)
    .eq('status', 'scheduled')
    .gt('scheduled_at', now.toISOString())
    .limit(500);
  if (error) throw new Error(error.message);
  const days = [...new Set((data || []).map((r) => String(r.scheduled_at).slice(0, 10)))].sort();
  return { count: days.length, last: days.length ? days[days.length - 1] : null };
}

/** First slot: three working days after the last queued card, or the next working day. 10:30 Central. */
export function firstSlot(lastDay, now = new Date()) {
  let d;
  if (lastDay) {
    d = addBusinessDays(new Date(`${lastDay}T15:30:00Z`), QUOTE_CARD_GAP_DAYS);
  } else {
    const t = new Date(now.getTime() + 24 * 3600 * 1000);
    t.setUTCHours(15, 30, 0, 0);
    d = nextWeekday(t);
  }
  return d;
}

export async function keepQuoteCardsRunning({ email, now = new Date() } = {}) {
  const owner = String(email || '').trim().toLowerCase();
  if (!owner) return { ok: false, error: 'owner email required' };
  const queued = await queuedCardDays(now);
  if (queued.count >= MIN_QUEUED_DAYS) {
    return { ok: true, skipped: true, message: `${queued.count} card days already queued through ${queued.last}.` };
  }

  // This week's bundle if it exists and was never scheduled; otherwise build one.
  const { data: pending } = await supabaseAdmin
    .from('ao_quote_review_queue')
    .select('*')
    .eq('source_type', 'internal_weekly_bundle')
    .eq('status', 'pending')
    .eq('created_by_email', owner)
    .order('created_at', { ascending: false })
    .limit(1);
  let row = pending?.[0] || null;
  if (!row) {
    const seeded = await seedWeeklyCorpusPullBundle({ email: owner, limit: 5, force: true });
    if (!seeded.ok || !seeded.id) return { ok: false, error: seeded.error || 'bundle not built' };
    const { data } = await supabaseAdmin.from('ao_quote_review_queue').select('*').eq('id', seeded.id).single();
    row = data;
  }
  const start = firstSlot(queued.last, now);
  const out = await scheduleWeeklyBundleRow(row, { start, gapDays: QUOTE_CARD_GAP_DAYS });
  return { ok: Boolean(out.ok), scheduled: out.scheduled?.length || 0, start: start.toISOString(), error: out.error };
}
