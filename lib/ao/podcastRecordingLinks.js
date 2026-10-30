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
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { sendRecordingLinkEmail } from './podcastRecordingLinkEmail.js';

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
