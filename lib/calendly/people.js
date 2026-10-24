/**
 * One person across all their conversations: the unit the CRM is built on.
 *
 * Bookings (engagement_inquiries) are conversations. ao_clients is the person.
 * ao_client_events is what happened. This joins them by email and adds the
 * judgments from intelligence.js, so the home screen and the client page read
 * the same picture.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { normEmail, listClientRecords } from './clientRecords.js';
import { toClient, stageOf } from './clients.js';
import {
  computeHealth,
  quietness,
  lastContactAt,
  nextConversationAt,
  upcomingDates,
  tierOf,
  metrics,
  nextMoves,
} from './intelligence.js';

const DAY = 24 * 60 * 60 * 1000;

async function allRows() {
  const { data, error } = await supabaseAdmin
    .from('engagement_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return data || [];
}

async function recentEvents(now) {
  const since = new Date(now - 400 * DAY).toISOString();
  const { data, error } = await supabaseAdmin
    .from('ao_client_events')
    .select('id, client_email, inquiry_id, kind, subject, body, meta, at')
    .gte('at', since)
    .order('at', { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return data || [];
}

/** What Bart needs to do for this person right now, most important first. */
export function needsFor(person) {
  const out = [];
  for (const s of person.sessions) {
    if (!s.needs_follow_up) continue;
    out.push(
      s.has_transcript
        ? { kind: 'send_follow_up', session_id: s.id, label: 'Send the follow-up' }
        : { kind: 'add_transcript', session_id: s.id, label: 'Add the transcript' }
    );
  }
  const drafts = person.sessions.flatMap((s) => (s.checkin_plan || []).filter((x) => x.status === 'draft'));
  if (drafts.length) out.push({ kind: 'approve_checkins', label: `${drafts.length} check-in${drafts.length === 1 ? '' : 's'} to approve` });
  const suggested = (person.details || []).filter((d) => d.status === 'suggested');
  if (suggested.length) out.push({ kind: 'confirm_details', label: `${suggested.length} personal detail${suggested.length === 1 ? '' : 's'} to confirm` });
  if (person.quiet) out.push({ kind: 'gone_quiet', label: `Quiet for ${person.quiet.days} days` });
  if (person.web_watch?.unseen) out.push({ kind: 'news', label: 'Something new about them online' });
  return out;
}

function assemble(email, rows, record, events, now) {
  const sessions = rows.map((r) => toClient(r, now, record)).sort((a, b) => Date.parse(b.scheduled_for || b.created_at) - Date.parse(a.scheduled_for || a.created_at));
  const latestRow = rows.slice().sort((a, b) => Date.parse(b.answers?.scheduled_for || b.created_at) - Date.parse(a.answers?.scheduled_for || a.created_at))[0];
  const stage = record?.stage || (latestRow ? stageOf(latestRow, now, record) : 'met');
  const person = {
    email,
    name: record?.name || latestRow?.name || email,
    phone: record?.phone || latestRow?.phone || null,
    company: record?.prep?.company || null,
    role: record?.prep?.role || latestRow?.role || null,
    org_size: latestRow?.org_size || null,
    stage,
    test: rows.some((r) => r.answers?.test),
    record,
    sessions,
    rows,
    events,
    thread: record?.thread || {},
    details: Array.isArray(record?.details) ? record.details : [],
    web_watch: record?.web_watch || {},
    consent: sessions[0]?.consent || {},
    podcast_interest: record?.podcast_interest || null,
    notes: record?.notes || '',
    prep: sessions[0]?.prep || null,
  };
  person.tier = tierOf(person);
  // The judgments read the raw bookings (dates live on answers); the screen
  // gets the friendlier session objects. Mixing them up made every
  // conversation date invisible to the health meter on the first live run.
  const judged = { ...person, sessions: rows };
  person.last_contact_at = lastContactAt(judged, now);
  person.next_conversation_at = nextConversationAt(judged, now);
  person.quiet = quietness(judged, now);
  person.health = computeHealth(judged, now);
  person.upcoming_dates = upcomingDates(person, now);
  const size = Number(String(person.org_size || '').replace(/[^0-9]/g, '')) || 0;
  person.ali_candidate = size >= 5;
  person.needs = needsFor(person);
  person.next_moves = nextMoves(person, now);
  return person;
}

/** Everyone, newest activity first. */
export async function listPeople(now = Date.now()) {
  const [rows, records, events] = await Promise.all([allRows(), listClientRecords(), recentEvents(now)]);
  const recordBy = new Map(records.map((r) => [r.email, r]));
  const rowsBy = new Map();
  for (const r of rows) {
    const e = normEmail(r.email);
    if (!e) continue;
    if (!rowsBy.has(e)) rowsBy.set(e, []);
    rowsBy.get(e).push(r);
  }
  const eventsBy = new Map();
  for (const ev of events) {
    if (!eventsBy.has(ev.client_email)) eventsBy.set(ev.client_email, []);
    eventsBy.get(ev.client_email).push(ev);
  }
  return [...rowsBy.entries()].map(([email, rs]) => assemble(email, rs, recordBy.get(email) || null, eventsBy.get(email) || [], now));
}

export async function getPerson(email, now = Date.now()) {
  const people = await listPeople(now);
  return people.find((p) => p.email === normEmail(email)) || null;
}

/** What the screen gets: no raw rows or internal events beyond the timeline. */
export function publicPerson(p) {
  const { rows, record, ...rest } = p;
  return {
    ...rest,
    events: p.events.map(({ id, kind, subject, body, at, inquiry_id }) => ({ id, kind, subject, body, at, inquiry_id })),
    web_watch: { checked_at: p.web_watch.checked_at || null, items: p.web_watch.items || [], unseen: Boolean(p.web_watch.unseen) },
  };
}

/** The home screen: what needs Bart, this week, everyone at a glance, and his numbers. */
export async function homeView(now = Date.now()) {
  const people = await listPeople(now);
  const weekEnd = now + 7 * DAY;
  const needs = people
    .filter((p) => p.needs.length)
    .map((p) => ({ email: p.email, name: p.name, test: p.test, health: p.health, items: p.needs }))
    .sort((a, b) => a.health.score - b.health.score);
  const thisWeek = people
    .flatMap((p) =>
      p.sessions
        .filter((s) => !s.cancelled_at && Date.parse(s.scheduled_for || '') > now && Date.parse(s.scheduled_for) <= weekEnd)
        .map((s) => ({ email: p.email, name: p.name, test: p.test, at: s.scheduled_for, joining: s.joining, brief_ready: Boolean(s.research_brief), prep_done: Boolean(p.prep) }))
    )
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const dates = people.flatMap((p) => p.upcoming_dates.map((d) => ({ email: p.email, name: p.name, ...d })));
  const glance = people
    .map((p) => ({
      email: p.email,
      name: p.name,
      company: p.company,
      stage: p.stage,
      tier: p.tier,
      test: p.test,
      health: p.health,
      quiet: p.quiet,
      last_contact_at: p.last_contact_at,
      next_conversation_at: p.next_conversation_at,
      needs: p.needs.length,
    }))
    .sort((a, b) => (b.needs ? 1 : 0) - (a.needs ? 1 : 0) || a.health.score - b.health.score);
  const moves = people
    .filter((p) => p.next_moves.length)
    .map((p) => ({ email: p.email, name: p.name, test: p.test, moves: p.next_moves }))
    .sort((a, b) => (b.moves[0].kind === 'reach_out' ? 1 : 0) - (a.moves[0].kind === 'reach_out' ? 1 : 0));
  return { needs, this_week: thisWeek, coming_up: dates, next_moves: moves, people: glance, metrics: metrics(people, now) };
}
