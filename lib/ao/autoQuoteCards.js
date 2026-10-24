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
import { scheduledPosts, updateCaptionAndText } from '../db/scheduledPosts.js';
import { seedWeeklyCorpusPullBundle } from './seedWeeklyCorpusPullBundle.js';
import { scheduleWeeklyBundleRow, buildCaptionForCardPost } from './scheduleWeeklyBundle.js';
import { generatePullQuoteCaptionsForQuotes } from './pullQuoteCaptions.js';
import { detectVoiceViolations } from './voiceGuardrails.js';
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

/** The stand-in captions the generator used to return when Claude did not answer. */
const STAND_IN = [/^A line worth sitting with, from/i, /^Context for the line on the image/i, /^Reflection, from/i];

export function postNeedsNewCaption(text) {
  const t = String(text || '').trim();
  return !t || t === '—' || STAND_IN.some((re) => re.test(t)) || detectVoiceViolations(t).length > 0;
}

/**
 * Queued card posts carrying a stand-in caption get real ones before they go
 * out. The first self-scheduled batch (2026-10-24) went out to the queue with
 * the stand-in on all 25 posts.
 */
export async function repairQueuedCardCaptions(now = new Date()) {
  const { data, error } = await scheduledPosts()
    .select('id, platform, text, source_quote_id, intent')
    .in('source_kind', CARD_KINDS)
    .eq('status', 'scheduled')
    .gt('scheduled_at', now.toISOString())
    .limit(500);
  if (error) throw new Error(error.message);
  const bad = (data || []).filter((p) => p.source_quote_id && postNeedsNewCaption(p.text));
  let updated = await refitCutXPosts((data || []).filter((p) => !bad.includes(p)));
  const failed = [];
  for (const bundleId of [...new Set(bad.map((p) => p.source_quote_id))]) {
    const { data: row } = await supabaseAdmin.from('ao_quote_review_queue').select('id, studio_playbook').eq('id', bundleId).single();
    const bundle = row?.studio_playbook?.weekly_corpus_pull;
    const items = Array.isArray(bundle?.items) ? bundle.items : [];
    const out = items.length ? await generatePullQuoteCaptionsForQuotes(items) : { ok: false };
    if (!out.ok) {
      failed.push(bundleId);
      continue;
    }
    const fixed = items.map((it, i) => ({ ...it, caption: out.captions[i], caption_x: out.captions_x[i] }));
    await supabaseAdmin
      .from('ao_quote_review_queue')
      .update({ studio_playbook: { ...row.studio_playbook, weekly_corpus_pull: { ...bundle, items: fixed } } })
      .eq('id', bundleId);
    for (const p of bad.filter((x) => x.source_quote_id === bundleId)) {
      const item = fixed[(Number(p.intent?.index) || 0) - 1];
      if (!item) continue;
      const r = await updateCaptionAndText({ id: p.id, body: buildCaptionForCardPost(item, p.platform) });
      if (r.ok) updated += 1;
    }
  }
  if (failed.length) console.error(`[autoQuoteCards] captions still missing for bundles ${failed.join(', ')}`);
  return { needed: bad.length, updated, failed };
}

/** X posts that were cut through the link: rebuilt from the stored caption, no new writing. */
async function refitCutXPosts(posts) {
  const cut = posts.filter((p) => p.platform === 'twitter' && p.source_quote_id);
  let fixed = 0;
  const items = new Map();
  for (const p of cut) {
    if (!items.has(p.source_quote_id)) {
      const { data: row } = await supabaseAdmin.from('ao_quote_review_queue').select('studio_playbook').eq('id', p.source_quote_id).single();
      items.set(p.source_quote_id, row?.studio_playbook?.weekly_corpus_pull?.items || []);
    }
    const item = items.get(p.source_quote_id)[(Number(p.intent?.index) || 0) - 1];
    if (!item?.url || String(p.text || '').includes(item.url)) continue;
    const r = await updateCaptionAndText({ id: p.id, body: buildCaptionForCardPost(item, 'twitter') });
    if (r.ok) fixed += 1;
  }
  return fixed;
}

export async function keepQuoteCardsRunning({ email, now = new Date() } = {}) {
  const owner = String(email || '').trim().toLowerCase();
  if (!owner) return { ok: false, error: 'owner email required' };

  // Fix what is already queued first. One caption call per run keeps this
  // inside the time a run is allowed; the queue tops up on the next run.
  const repaired = await repairQueuedCardCaptions(now);
  if (repaired.needed || repaired.updated) {
    return { ok: repaired.failed.length === 0, repaired, message: `Rewrote captions on ${repaired.updated} of ${repaired.needed} queued posts.` };
  }
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
