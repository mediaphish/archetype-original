/**
 * Auto > Clients: everyone who booked a conversation or sent a note, where they
 * stand, and what is waiting on Bart.
 *
 * Bart, 2026-10-23: move follow-ups out of email and into Auto, with Auto
 * growing from podcast, writing and marketing into the sales funnel and
 * client management. Phase 1 is this list; Auto suggesting next moves comes
 * later.
 *
 * Everything is stored on the engagement_inquiries row's answers, next to the
 * booking itself, so the list and the follow-up job read the same record.
 */

import { supabaseAdmin } from '../supabase-admin.js';

/** The stages Bart moves people through, in order. */
export const STAGES = [
  { key: 'booked', label: 'Booked' },
  { key: 'met', label: 'Met' },
  { key: 'season', label: 'In a season' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'not_now', label: 'Not now' },
];
const STAGE_KEYS = new Set(STAGES.map((s) => s.key));

/** Where a person is. An explicit choice wins; otherwise it follows the booking. */
export function stageOf(row, now = Date.now()) {
  const a = row?.answers || {};
  if (a.stage && STAGE_KEYS.has(a.stage)) return a.stage;
  if (a.cancelled_at) return 'not_now';
  const start = Date.parse(a.scheduled_for || '');
  if (Number.isFinite(start) && start > now) return 'booked';
  return 'met';
}

/** True when the call is over and nothing has been sent or set aside yet. */
export function needsFollowUp(row, now = Date.now()) {
  const a = row?.answers || {};
  if (a.source !== 'calendly' || a.cancelled_at) return false;
  if (a.thank_you_sent_at || a.reinvite_sent_at || a.followup_dismissed_at) return false;
  const start = Date.parse(a.scheduled_for || '');
  return Number.isFinite(start) && start <= now;
}

/** What the screen needs about one person, and nothing private to the system. */
export function toClient(row, now = Date.now()) {
  const a = row.answers || {};
  const isBooking = a.source === 'calendly';
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    role: row.role || null,
    org_size: row.org_size || null,
    created_at: row.created_at,
    kind: isBooking ? 'conversation' : a.q7 && /rising/i.test(String(a.q7)) ? 'rising_note' : 'inquiry',
    test: Boolean(a.test),
    stage: stageOf(row, now),
    needs_follow_up: needsFollowUp(row, now),
    scheduled_for: a.scheduled_for || null,
    cancelled_at: a.cancelled_at || null,
    joining: a.location_type === 'outbound_call' ? 'phone' : a.location_type ? 'zoom' : null,
    join_url: a.join_url || null,
    reschedule_url: a.reschedule_url || null,
    what_they_wrote: isBooking
      ? (a.questions_and_answers || []).filter((x) => String(x.answer || '').trim())
      : formAnswers(a),
    research_brief: a.research_brief || null,
    research_error: a.research_error || null,
    research_at: a.research_at || null,
    thank_you_draft: a.thank_you_draft || null,
    thank_you_sent_at: a.thank_you_sent_at || null,
    thank_you_text: a.thank_you_text || null,
    reinvite_sent_at: a.reinvite_sent_at || null,
    notes: a.notes || '',
  };
}

/** The old form's answers, readable. */
function formAnswers(a) {
  const labels = {
    q1: 'What prompted you to reach out?',
    q3: 'What would an outside perspective help you see?',
    q5: 'What would meaningful progress look like?',
    q6: 'What is working that you want to protect?',
    q7: 'Partnership considered',
    q8: 'Anything else',
  };
  return Object.entries(labels)
    .map(([k, question]) => ({ question, answer: Array.isArray(a[k]) ? a[k].join(', ') : a[k] }))
    .filter((x) => String(x.answer || '').trim());
}

export async function listClients(now = Date.now()) {
  const { data, error } = await supabaseAdmin
    .from('engagement_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toClient(row, now));
}

export function isStage(key) {
  return STAGE_KEYS.has(key);
}
