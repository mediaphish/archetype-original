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
import { listClientRecords, normEmail, consentOf } from './clientRecords.js';

/** The stages Bart moves people through, in order. */
export const STAGES = [
  // Bart, 2026-10-25: "Please make sure all guests are added to the CRM. Even
  // without a tier locked in, they are still contacts that I will want my team
  // to follow up on."
  { key: 'contact', label: 'Contact' },
  { key: 'booked', label: 'Booked' },
  { key: 'met', label: 'Met' },
  { key: 'season', label: 'In a season' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'not_now', label: 'Not now' },
];
const STAGE_KEYS = new Set(STAGES.map((s) => s.key));

/** Where a person is. An explicit choice wins; otherwise it follows the booking. */
export function stageOf(row, now = Date.now(), record = null) {
  const a = row?.answers || {};
  if (record?.stage && STAGE_KEYS.has(record.stage)) return record.stage;
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
export function toClient(row, now = Date.now(), record = null) {
  const a = row.answers || {};
  const prep = record?.prep || {};
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
    stage: stageOf(row, now, record),
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
    notes: record?.notes ?? a.notes ?? '',
    session_completed_at: a.session_completed_at || null,
    prep_email_sent_at: a.prep_email_sent_at || null,
    prep_submitted_at: prep.submitted_at || null,
    prep: prep.submitted_at
      ? {
          company: prep.company || null,
          role: prep.role || null,
          website: prep.website || null,
          linkedin: prep.linkedin || null,
          texts_ok: Boolean(prep.texts_ok),
          worth_it: prep.worth_it || null,
          how_you_work: prep.how_you_work || null,
          anything_else: prep.anything_else || null,
        }
      : null,
    consent: {
      record: consentOf(record, 'record'),
      archy: consentOf(record, 'archy'),
      checkins: consentOf(record, 'checkins'),
    },
    podcast_interest: record?.podcast_interest || null,
    has_transcript: Boolean(a.transcript_at),
    transcript_at: a.transcript_at || null,
    analysis: a.transcript_analysis
      ? {
          summary: a.transcript_analysis.summary,
          key_points: a.transcript_analysis.key_points,
          action_items: a.transcript_analysis.action_items,
          next_time: a.transcript_analysis.next_time,
          bart_links: a.transcript_analysis.bart_links || null,
          bart_links_at: a.transcript_analysis.bart_links_at || null,
        }
      : null,
    checkin_plan: Array.isArray(a.checkin_plan) ? a.checkin_plan : [],
    checkins_stopped_at: a.checkins_stopped_at || null,
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
  const records = new Map((await listClientRecords().catch(() => [])).map((r) => [r.email, r]));
  return (data || []).map((row) => toClient(row, now, records.get(normEmail(row.email)) || null));
}

export function isStage(key) {
  return STAGE_KEYS.has(key);
}
