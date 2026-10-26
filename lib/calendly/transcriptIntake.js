/**
 * Transcripts that arrive on their own.
 *
 * From the CRM list Bart asked to have built (2026-10-24), item 2. Bart records
 * client calls with Zoom's cloud recording, and also uses Wispr Flow and, face
 * to face, Echo. Zoom sends its transcript here when the recording is done
 * (api/zoom/webhook.js); anything else can be dropped in too. Each one waits in
 * ao_incoming_transcripts, is matched to the conversation it belongs to, and is
 * read exactly as if Bart had pasted it in: summary, action items, the
 * thank-you for him to review, the check-in plan. Nothing is sent to anyone.
 *
 * Matching: a Zoom meeting is matched by its meeting number against the join
 * link Calendly gave the booking, then by start time. When nothing matches,
 * the transcript waits in "Transcripts to match" in Auto and Bart picks the
 * person. Someone who said no to recording never has a transcript read.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { consentOf, getClientRecord, addEvent } from './clientRecords.js';
import { cleanTranscript, analyzeTranscript, saveTranscript, planFrom } from './transcripts.js';
import { markRow, getBooking, sendToBart } from './followups.js';
import { noticeHtml } from './emailLayout.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';
const MATCH_WINDOW_MS = 45 * 60 * 1000;

/** The meeting number in a Zoom join link (https://zoom.us/j/81234567890?pwd=...). */
export function zoomMeetingId(joinUrl) {
  const m = String(joinUrl || '').match(/\/j\/(\d{9,12})/);
  return m ? m[1] : null;
}

/** Which recorder an emailed transcript came from, for the record. */
export function emailedSource(subject, text) {
  const s = `${subject || ''} ${String(text || '').slice(0, 2000)}`.toLowerCase();
  if (/wispr/.test(s)) return 'wispr';
  if (/\becho\b/.test(s)) return 'echo';
  return 'email';
}

/**
 * Pure: the conversation an emailed transcript belongs to, or null. Bart
 * sends it after the call, so it looks back six hours from when he sent it.
 * One conversation in that window is the match; with more, a first name in
 * the subject decides; otherwise Bart picks.
 */
export function pickBookingForEmail(rows, { sentAt, subject = '' }) {
  const t = Date.parse(sentAt || '');
  if (!Number.isFinite(t)) return null;
  const live = (rows || []).filter((r) => {
    const at = Date.parse(r.answers?.scheduled_for || '');
    return !r.answers?.cancelled_at && Number.isFinite(at) && at <= t + 15 * 60 * 1000 && at >= t - 6 * 3600 * 1000;
  });
  if (live.length === 1) return live[0];
  const subj = String(subject || '').toLowerCase();
  const named = live.filter((r) => {
    const first = String(r.name || '').trim().split(/\s+/)[0].toLowerCase();
    return first.length > 1 && new RegExp(`\\b${first.replace(/[^a-z0-9]/g, '')}\\b`).test(subj);
  });
  return named.length === 1 ? named[0] : null;
}

/** Pure: the booking a meeting belongs to, or null. */
export function pickBooking(rows, { meetingId = null, startedAt = null } = {}) {
  const live = (rows || []).filter((r) => !r.answers?.cancelled_at);
  if (meetingId) {
    const byId = live.find((r) => zoomMeetingId(r.answers?.join_url) === String(meetingId));
    if (byId) return byId;
  }
  const t = Date.parse(startedAt || '');
  if (!Number.isFinite(t)) return null;
  const near = live
    .map((r) => ({ r, d: Math.abs(Date.parse(r.answers?.scheduled_for || '') - t) }))
    .filter((x) => Number.isFinite(x.d) && x.d <= MATCH_WINDOW_MS)
    .sort((a, b) => a.d - b.d);
  // Two bookings that close together is a guess, not a match: Bart decides.
  if (near.length === 1 || (near.length > 1 && near[1].d - near[0].d > 20 * 60 * 1000)) return near[0].r;
  return null;
}

/**
 * Read a transcript for one conversation, the same as pasting it in Auto.
 * Shared by the Transcript box in Auto and the incoming path.
 */
export async function takeTranscript(row, rawText, { source = 'pasted' } = {}) {
  const record = await getClientRecord(row.email).catch(() => null);
  if (consentOf(record, 'record') === 'no') {
    return { ok: false, status: 403, error: `${row.name} said no to recording, so transcripts are off for them.` };
  }
  const transcript = cleanTranscript(rawText);
  if (transcript.length < 200) return { ok: false, status: 400, error: 'That transcript looks empty or too short.' };
  const result = await analyzeTranscript(row, transcript);
  if (!result.ok) return { ok: false, status: 502, error: result.error };
  await saveTranscript(row, transcript, result.analysis);
  const a = row.answers || {};
  const now = new Date().toISOString();
  await markRow(row, {
    transcript_at: now,
    transcript_source: source,
    transcript_analysis: result.analysis,
    // A thank-you that has not gone out yet is replaced by one built from the real conversation.
    ...(a.thank_you_sent_at ? {} : { thank_you_draft: result.analysis.thank_you, followup_drafted_at: now }),
    checkin_plan: planFrom(result.analysis, a.scheduled_for),
    checkins_stopped_at: null,
  });
  await addEvent({
    email: row.email,
    inquiryId: row.id,
    kind: 'transcript_added',
    body: result.analysis.summary,
    meta: { action_items: result.analysis.action_items, source },
  });
  return { ok: true, analysis: result.analysis };
}

/** Keep an incoming transcript to be read on the next run. */
export async function queueIncoming({ source, externalId = null, meetingId = null, startedAt = null, topic = null, transcript }) {
  const { data, error } = await supabaseAdmin
    .from('ao_incoming_transcripts')
    .upsert(
      { source, external_id: externalId, meeting_id: meetingId, started_at: startedAt, topic, transcript },
      { onConflict: 'source,external_id', ignoreDuplicates: true }
    )
    .select('id');
  if (error) throw new Error(error.message);
  return data?.[0]?.id || null;
}

export async function listUnmatched() {
  const { data, error } = await supabaseAdmin
    .from('ao_incoming_transcripts')
    .select('id, source, started_at, topic, received_at, transcript')
    .eq('status', 'unmatched')
    .order('received_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data || []).map(({ transcript, ...rest }) => ({ ...rest, preview: String(transcript || '').slice(0, 400) }));
}

/** Bart picked the conversation, or set it aside. */
export async function resolveIncoming(id, { inquiryId = null, discard = false } = {}) {
  const patch = discard ? { status: 'discarded', done_at: new Date().toISOString() } : { inquiry_id: inquiryId, status: 'new', error: null };
  const { error } = await supabaseAdmin.from('ao_incoming_transcripts').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * One incoming transcript per run: reading one takes a couple of minutes and
 * the job has five. Whatever is left runs fifteen minutes later.
 */
export async function processIncoming() {
  const { data } = await supabaseAdmin
    .from('ao_incoming_transcripts')
    .select('*')
    .eq('status', 'new')
    .order('received_at', { ascending: true })
    .limit(1);
  const item = data?.[0];
  if (!item) return [];
  const set = (patch) => supabaseAdmin.from('ao_incoming_transcripts').update(patch).eq('id', item.id);

  let row = item.inquiry_id ? await getBooking(item.inquiry_id) : null;
  if (!row) {
    const { data: rows } = await supabaseAdmin.from('engagement_inquiries').select('*').limit(1000);
    row = item.source === 'zoom'
      ? pickBooking(rows, { meetingId: item.meeting_id, startedAt: item.started_at })
      : pickBookingForEmail(rows, { sentAt: item.started_at, subject: item.topic });
  }
  if (!row) {
    await set({ status: 'unmatched' });
    await sendToBart({
      subject: 'A transcript came in that I could not match',
      html: noticeHtml({
        title: 'A transcript needs a person',
        lines: [`From ${item.source}${item.topic ? `: ${item.topic}` : ''}${item.started_at ? `, ${new Date(item.started_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}` : ''}.`, 'Pick who it belongs to in Auto and I will read it.'],
        cta: { label: 'Open the CRM', url: `${SITE}/ao/crm` },
      }),
    });
    return [{ due: 'incoming transcript', ok: true, unmatched: item.id }];
  }

  const r = await takeTranscript(row, item.transcript, { source: item.source });
  if (!r.ok) {
    // A no to recording is final; anything else tries again next run, then waits for Bart.
    const final = r.status === 403 || r.status === 400;
    await set(final ? { status: 'skipped', error: r.error, inquiry_id: row.id, done_at: new Date().toISOString() } : { error: r.error, status: item.error ? 'unmatched' : 'new', inquiry_id: row.id });
    return [{ due: 'incoming transcript', ok: false, error: r.error }];
  }
  await set({ status: 'done', inquiry_id: row.id, done_at: new Date().toISOString() });
  await sendToBart({
    subject: `${row.name}: transcript read, thank-you ready for you`,
    html: noticeHtml({
      title: `${row.name}'s conversation is in`,
      lines: ['The summary, action items and a thank-you are waiting for you. Nothing has been sent.'],
      cta: { label: 'Open their page in Auto', url: `${SITE}/ao/crm?c=${encodeURIComponent(row.email)}` },
    }),
  });
  return [{ due: 'incoming transcript', ok: true, read: row.id }];
}

/** Bart matched a waiting transcript to a conversation: read it now. */
export async function readIncomingFor(id, inquiryId) {
  const { data: item } = await supabaseAdmin.from('ao_incoming_transcripts').select('*').eq('id', id).maybeSingle();
  if (!item) return { ok: false, status: 404, error: 'That transcript is gone.' };
  const row = await getBooking(inquiryId);
  if (!row) return { ok: false, status: 404, error: 'That conversation was not found.' };
  const r = await takeTranscript(row, item.transcript, { source: item.source });
  await supabaseAdmin
    .from('ao_incoming_transcripts')
    .update(r.ok ? { status: 'done', inquiry_id: row.id, done_at: new Date().toISOString(), error: null } : { inquiry_id: row.id, error: r.error })
    .eq('id', id);
  return r;
}
