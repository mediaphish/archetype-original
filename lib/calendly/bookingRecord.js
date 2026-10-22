/**
 * A Calendly booking, saved to the same inquiries list the old form used.
 *
 * Bart, 2026-10-22, on sending "Book a conversation" straight to Calendly:
 * "There was a lot of good information captured in that Work With Bart form."
 * The form's questions now live on the Calendly booking (one required, the
 * rest optional), and every booking lands in engagement_inquiries with its
 * answers, so nothing the form used to capture is lost.
 */

import { supabaseAdmin } from '../supabase-admin.js';

/** Calendly question wording → the field it fills. */
const FIELDS = [
  [/reach out now/i, 'reach_out_now'],
  [/clarity or perspective/i, 'clarity_sought'],
  [/success look like/i, 'success_looks_like'],
  [/strengths or practices/i, 'strengths_to_keep'],
  [/your role/i, 'role'],
  [/people are in your organization/i, 'org_size'],
  [/anything else/i, 'anything_else'],
  [/talk about/i, 'topic'],
];

function fieldFor(question) {
  const hit = FIELDS.find(([re]) => re.test(String(question || '')));
  return hit ? hit[1] : null;
}

/** Row for engagement_inquiries from an invitee.created payload. */
export function inquiryFromBooking(payload) {
  const p = payload || {};
  const event = p.scheduled_event || {};
  const qa = Array.isArray(p.questions_and_answers) ? p.questions_and_answers : [];
  const answers = {
    source: 'calendly',
    option: 'conversation',
    scheduled_for: event.start_time || null,
    event_name: event.name || null,
    location_type: event.location?.type || null,
    join_url: event.location?.join_url || null,
    calendly_invitee_uri: p.uri || null,
    calendly_event_uri: event.uri || null,
    reschedule_url: p.reschedule_url || null,
    cancel_url: p.cancel_url || null,
    rescheduled_from: p.old_invitee || null,
    questions_and_answers: qa.map((x) => ({ question: x.question, answer: x.answer })),
    utm: p.tracking || null,
  };
  for (const x of qa) {
    const key = fieldFor(x.question);
    if (key && key !== 'role' && key !== 'org_size') answers[key] = x.answer || null;
  }
  const byField = (name) => qa.find((x) => fieldFor(x.question) === name)?.answer || null;
  // A phone call booking carries the number Bart should call.
  const phone =
    (event.location?.type === 'outbound_call' && event.location?.location) || p.text_reminder_number || null;
  return {
    name: String(p.name || '').trim() || String(p.email || '').trim(),
    email: String(p.email || '').trim(),
    phone,
    role: byField('role'),
    org_size: byField('org_size'),
    answers,
  };
}

export async function saveBooking(payload) {
  const row = inquiryFromBooking(payload);
  if (!row.email) return { ok: false, error: 'no email on booking' };
  const { error } = await supabaseAdmin.from('engagement_inquiries').insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Mark a saved booking cancelled rather than deleting it. */
export async function markCancelled(payload) {
  const uri = payload?.uri;
  if (!uri) return { ok: false, error: 'no invitee uri' };
  const { data, error } = await supabaseAdmin
    .from('engagement_inquiries')
    .select('id, answers')
    .eq('answers->>calendly_invitee_uri', uri)
    .limit(1);
  if (error) return { ok: false, error: error.message };
  const found = data?.[0];
  if (!found) return { ok: false, error: 'booking not found' };
  const answers = {
    ...(found.answers || {}),
    cancelled_at: new Date().toISOString(),
    cancel_reason: payload?.cancellation?.reason || null,
    cancelled_by: payload?.cancellation?.canceled_by || null,
  };
  const up = await supabaseAdmin.from('engagement_inquiries').update({ answers }).eq('id', found.id);
  return up.error ? { ok: false, error: up.error.message } : { ok: true };
}
