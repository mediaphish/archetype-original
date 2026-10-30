/**
 * Studio link emails, sent on their own before each recording.
 *
 * Bart, 2026-10-30: "I want this to be the workflow. That is a generic link.
 * We can send it to everyone." Every booked recording (a row in
 * ao_podcast_schedule with a guest) gets the "Recording day is set" email
 * with the one Riverside studio link, five days before it starts. A booking
 * made inside those five days gets it on the next daily run. Each slot is
 * sent once (recording_link_sent_at).
 *
 * The studio link lives in RIVERSIDE_STUDIO_URL, not in this public repo.
 *
 * Bart, 2026-10-30: "Make sure the process includes clear directions and
 * notifications for when I need to take action." The same daily run emails
 * him, each once per recording:
 * - the day before: who, when, and the brief to read (or that prep is missing);
 * - the morning after: add post-recording notes, then bring the transcript in;
 * - three days after, only if the notes are still missing: a nudge;
 * - right away, if a guest's studio link email fails: text them the link.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { sendRecordingLinkEmail } from './podcastRecordingLinkEmail.js';
import { getSiteUrl } from './podcastGuestAuth.js';
import { formatRecordingDateTime } from './podcastScheduleUtils.js';

export const LEAD_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export function studioLink() {
  return String(process.env.RIVERSIDE_STUDIO_URL || '').trim() || null;
}

/** Calendar date (YYYY-MM-DD) of an instant in Central time. */
function centralDate(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/** Pure: due when it has a guest, is still ahead, is not sent, and its Central date is LEAD_DAYS or fewer days off. */
export function isDue(slot, now = new Date()) {
  if (!slot || !slot.guest_id || slot.recording_link_sent_at) return false;
  const at = new Date(slot.scheduled_at).getTime();
  if (!Number.isFinite(at)) return false;
  const t = new Date(now).getTime();
  if (at <= t) return false;
  const days = Math.round((Date.parse(centralDate(at)) - Date.parse(centralDate(t))) / DAY_MS);
  return days <= LEAD_DAYS;
}

/** Pure: whole Central calendar days from now until the recording (negative once it has passed). */
export function daysUntil(slot, now = new Date()) {
  const at = new Date(slot?.scheduled_at).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.round((Date.parse(centralDate(at)) - Date.parse(centralDate(new Date(now).getTime()))) / DAY_MS);
}

/**
 * Pure: the notice Bart needs today for one slot, or null. Each kind goes once.
 * slot carries the guest (name, prep fields, post-recording notes).
 */
export function bartNoticeFor(slot, now = new Date(), site = 'https://www.archetypeoriginal.com') {
  if (!slot?.guest_id || !slot.guest) return null;
  const d = daysUntil(slot, now);
  if (d === null) return null;
  const g = slot.guest;
  const name = g.name || 'your guest';
  const page = `${site}/ao/podcast/guest/${slot.guest_id}`;
  const { dateStr, timeStr } = formatRecordingDateTime(slot.scheduled_at, 'America/Chicago');
  const mentor = g.session_type === 'mentor';
  const what = mentor ? 'mentor session' : 'recording';
  const prepped = Boolean(g.research_brief && g.suggested_questions && g.producer_brief);
  const notesIn = Boolean(g.post_recording_captured_at || g.post_recording_landed || g.post_recording_surprise || g.post_recording_follow_up);

  if (d === 1 && !slot.reminder_sent_at) {
    return {
      kind: 'reminder',
      subject: `Tomorrow: ${what} with ${name} at ${timeStr}`,
      title: `Your ${what} with ${name} is tomorrow`,
      lines: [
        `${dateStr} at ${timeStr}, in your Riverside studio.`,
        slot.recording_link_sent_at ? `${name} has the studio link.` : `${name} has not been sent the studio link yet. Text them your studio link today.`,
        prepped
          ? 'What to do: read the producer brief tonight or tomorrow morning. It is on their page.'
          : 'Prep is not finished. What to do: ask Cam in Auto to prepare this guest today, then read the producer brief.',
        'Open the studio a few minutes early. They will text you if anything does not connect.',
      ],
      cta: { label: `Open ${name}'s page`, url: page },
    };
  }
  if (d <= -1 && d >= -14 && !slot.followup_sent_at) {
    return {
      kind: 'followup',
      subject: `Two steps after your ${what} with ${name}`,
      title: `After your ${what} with ${name}`,
      lines: [
        notesIn ? 'Step 1 is done: your post-recording notes are in.' : 'Step 1: add your post-recording notes on their page while it is fresh: what surprised you, what landed, and any follow-up you promised.',
        'Step 2: in Riverside, open the recording and download the transcript. Then in Auto, attach the file and say "process this episode."',
        'Nothing else is waiting on you after that. Auto drafts the episode for your review.',
      ],
      cta: { label: notesIn ? `Open ${name}'s page` : 'Add post-recording notes', url: `${page}#post-recording` },
    };
  }
  if (d <= -3 && d >= -14 && slot.followup_sent_at && !slot.nudge_sent_at && !notesIn) {
    return {
      kind: 'nudge',
      subject: `Still needed: notes from your ${what} with ${name}`,
      title: `Your notes from ${name}'s ${what} are still missing`,
      lines: [
        `It was ${dateStr}. The episode draft is better with your read on it.`,
        'What to do: add your post-recording notes on their page. It takes about five minutes.',
        'If you already brought the transcript into Auto, that is all that is left.',
      ],
      cta: { label: 'Add post-recording notes', url: `${page}#post-recording` },
    };
  }
  return null;
}

const NOTICE_COLUMN = { reminder: 'reminder_sent_at', followup: 'followup_sent_at', nudge: 'nudge_sent_at' };

async function emailBart(notice) {
  const [{ sendToBart }, { noticeHtml }] = await Promise.all([
    import('../calendly/followups.js'),
    import('../calendly/emailLayout.js'),
  ]);
  return sendToBart({
    subject: notice.subject,
    html: noticeHtml({ title: notice.title, lines: notice.lines, cta: notice.cta, eyebrow: 'Auto · Podcast' }),
  });
}

/** Daily: email Bart what each recording needs from him today. */
export async function sendBartRecordingNotices({ now = new Date() } = {}) {
  const from = new Date(new Date(now).getTime() - 15 * DAY_MS).toISOString();
  const to = new Date(new Date(now).getTime() + 2 * DAY_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select('id, guest_id, scheduled_at, recording_link_sent_at, reminder_sent_at, followup_sent_at, nudge_sent_at, guest:ao_podcast_guests(name, session_type, research_brief, suggested_questions, producer_brief, post_recording_captured_at, post_recording_landed, post_recording_surprise, post_recording_follow_up)')
    .gte('scheduled_at', from)
    .lte('scheduled_at', to);
  if (error) return { ok: false, error: error.message };

  const sent = [];
  const failed = [];
  for (const slot of data || []) {
    const notice = bartNoticeFor(slot, now, getSiteUrl());
    if (!notice) continue;
    const r = await emailBart(notice);
    if (!r.ok) {
      failed.push({ slot_id: slot.id, kind: notice.kind, error: r.error });
      continue;
    }
    await supabaseAdmin.from('ao_podcast_schedule').update({ [NOTICE_COLUMN[notice.kind]]: new Date().toISOString() }).eq('id', slot.id);
    sent.push({ slot_id: slot.id, kind: notice.kind, guest: slot.guest?.name || null });
  }
  return { ok: failed.length === 0, sent, failed };
}

/** Daily: send the studio link to every guest whose recording is due. */
export async function sendDueRecordingLinks({ now = new Date() } = {}) {
  const link = studioLink();
  if (!link) return { ok: false, error: 'RIVERSIDE_STUDIO_URL is not set' };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select('id, guest_id, scheduled_at, timezone, recording_link_sent_at, guest:ao_podcast_guests(id, name, email, schedule_timezone)')
    .is('recording_link_sent_at', null)
    .gt('scheduled_at', new Date(now).toISOString())
    .lte('scheduled_at', new Date(new Date(now).getTime() + (LEAD_DAYS + 1) * DAY_MS).toISOString());
  if (error) return { ok: false, error: error.message };

  const sent = [];
  const failed = [];
  for (const slot of (data || []).filter((s) => isDue(s, now))) {
    const guest = slot.guest;
    const timezone = slot.timezone || guest?.schedule_timezone || 'America/Chicago';
    const r = await sendRecordingLinkEmail({ guest, riversideLink: link, scheduledAt: slot.scheduled_at, timezone });
    if (!r.ok) {
      failed.push({ slot_id: slot.id, guest: guest?.name || null, error: r.error });
      const when = formatRecordingDateTime(slot.scheduled_at, 'America/Chicago');
      await emailBart({
        subject: `Action needed: ${guest?.name || 'A guest'} did not get the studio link`,
        title: `The studio link email to ${guest?.name || 'your guest'} did not go out`,
        lines: [
          `Their recording is ${when.dateStr} at ${when.timeStr}.`,
          `What to do: text or email them your studio link yourself: ${link}`,
          guest?.email ? `Their email on record is ${guest.email}. If it looks wrong, fix it on their page and the email will try again tomorrow morning.` : 'There is no email on their record. Add one on their page and the email will try again tomorrow morning.',
        ],
        cta: { label: `Open ${guest?.name || 'the guest'}'s page`, url: `${getSiteUrl()}/ao/podcast/guest/${slot.guest_id}` },
      }).catch(() => {});
      continue;
    }
    await supabaseAdmin.from('ao_podcast_schedule').update({ recording_link_sent_at: new Date().toISOString() }).eq('id', slot.id);
    sent.push({ slot_id: slot.id, guest: guest?.name || null, scheduled_at: slot.scheduled_at });
  }
  return { ok: failed.length === 0, sent, failed };
}

/** Record a booked recording so the studio link goes out on its own. Replaces that guest's other future slots. */
export async function scheduleRecording({ guestId, scheduledAt, timezone = 'America/Chicago', notes = '' } = {}) {
  const id = String(guestId || '').trim();
  const at = new Date(scheduledAt);
  if (!id) return { ok: false, error: 'guest_id required' };
  if (Number.isNaN(at.getTime())) return { ok: false, error: 'scheduled_at must be a date and time' };
  if (at.getTime() <= Date.now()) return { ok: false, error: 'scheduled_at is in the past' };

  const { data: guest, error: gErr } = await supabaseAdmin.from('ao_podcast_guests').select('id, name, email').eq('id', id).maybeSingle();
  if (gErr) return { ok: false, error: gErr.message };
  if (!guest) return { ok: false, error: 'guest not found' };
  if (!guest.email) return { ok: false, error: `${guest.name} has no email on record` };

  // One upcoming recording per guest: a reschedule replaces the old time.
  await supabaseAdmin
    .from('ao_podcast_schedule')
    .delete()
    .eq('guest_id', id)
    .is('recording_link_sent_at', null)
    .gt('scheduled_at', new Date().toISOString());

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .insert({ guest_id: id, scheduled_at: at.toISOString(), timezone, notes: notes || null })
    .select('id, scheduled_at')
    .single();
  if (error) return { ok: false, error: error.message };

  const sendOn = centralDate(Math.max(Date.now(), at.getTime() - LEAD_DAYS * DAY_MS));
  return {
    ok: true,
    slot_id: data.id,
    guest: guest.name,
    recording_at: data.scheduled_at,
    studio_link_goes_out: `${sendOn}, morning Central`,
  };
}
