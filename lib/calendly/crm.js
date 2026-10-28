/**
 * The CRM layer over the Clients data (notes/PLAN-crm.md).
 *
 * Bart, 2026-10-25: "I want to be able to open the page, know what to do, or
 * have an AI I can ask about it quickly. It's not going to just be podcast
 * episodes. It's every human I am working with or nurturing towards working
 * with."
 *
 * People come from lib/calendly/people.js (bookings, ao_clients records,
 * events). This adds what a CRM needs on top: a relationship, a source, a next
 * step with a date and an owner (ao_clients.crm), and Today: one ranked list of
 * what needs Bart right now.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { listPeople, getPerson, publicPerson } from './people.js';
import { normEmail, getClientRecord, upsertClientRecord, addEvent } from './clientRecords.js';
import { STAGES } from './clients.js';
import { TIERS } from './intelligence.js';

const DAY = 24 * 60 * 60 * 1000;

export const RELATIONSHIPS = [
  { key: 'client', label: 'Client' },
  { key: 'prospect', label: 'Prospect' },
  { key: 'podcast_guest', label: 'Podcast guest' },
  { key: 'mentee', label: 'Mentee' },
  { key: 'partner', label: 'Partner' },
  { key: 'contact', label: 'Contact' },
];
const RELATIONSHIP_KEYS = new Set(RELATIONSHIPS.map((r) => r.key));

export const SOURCES = [
  { key: 'podcast', label: 'Podcast' },
  { key: 'talk', label: 'A talk' },
  { key: 'referral', label: 'Referral' },
  { key: 'website', label: 'Website' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'event', label: 'Event' },
  { key: 'other', label: 'Other' },
];
const SOURCE_KEYS = new Set(SOURCES.map((s) => s.key));

export const OWNERS = [
  { key: 'bart', label: 'Bart' },
  { key: 'auto', label: 'Ada' },
  { key: 'jot', label: 'Jot' },
  { key: 'reach', label: 'Vox' },
  { key: 'producer', label: 'Cam' },
];
const OWNER_KEYS = new Set(OWNERS.map((o) => o.key));

function crmOf(person) {
  const c = person?.record?.crm;
  return c && typeof c === 'object' ? c : {};
}

/** What this person is to Bart. An explicit choice wins; otherwise it follows what is on record. */
export function relationshipOf(person) {
  const set = crmOf(person).relationship;
  if (RELATIONSHIP_KEYS.has(set)) return set;
  if (person?.tier || person?.stage === 'season' || person?.stage === 'ongoing') return 'client';
  const pod = person?.record?.flags?.podcast_guest;
  if (pod) return pod.track === 'mentor session' ? 'mentee' : 'podcast_guest';
  if ((person?.sessions || []).length) return 'prospect';
  return 'contact';
}

/** How they found Bart. An explicit choice wins; podcast sign-ups default to podcast. */
export function sourceOf(person) {
  const set = crmOf(person).source;
  if (SOURCE_KEYS.has(set)) return set;
  if (person?.record?.flags?.podcast_guest) return 'podcast';
  if ((person?.sessions || []).length) return 'website';
  return null;
}

/** The next step Bart or a teammate owns, with its date. */
export function nextStepOf(person) {
  const n = crmOf(person).next_step;
  if (!n || !String(n.what || '').trim()) return null;
  return {
    what: String(n.what).trim(),
    due: n.due || null,
    owner: OWNER_KEYS.has(n.owner) ? n.owner : 'bart',
    set_at: n.set_at || null,
  };
}

/** The last thing that came in from them, if nothing has gone back since. */
export function replyOwed(person, now = Date.now()) {
  const events = (person?.events || []).slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const lastIn = events.find((e) => e.kind === 'reply');
  if (!lastIn) return null;
  const lastOut = events.find((e) => e.kind === 'email_out' || e.kind === 'thank_you_sent' || e.kind === 'checkin_sent' || e.kind === 'reinvite_sent' || e.kind === 'conversation');
  if (lastOut && Date.parse(lastOut.at) >= Date.parse(lastIn.at)) return null;
  const days = Math.floor((now - Date.parse(lastIn.at)) / DAY);
  if (days > 30) return null;
  return { at: lastIn.at, days, subject: lastIn.subject || null };
}

function chicagoDay(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/** One person as the CRM lists them. */
export function crmRow(p, now = Date.now()) {
  const next = nextStepOf(p);
  return {
    email: p.email,
    name: p.name,
    company: p.company || null,
    role: p.role || null,
    phone: p.phone || null,
    stage: p.stage,
    tier: p.tier || null,
    relationship: relationshipOf(p),
    source: sourceOf(p),
    next_step: next,
    reply_owed: replyOwed(p, now),
    health: p.health,
    quiet: p.quiet,
    last_contact_at: p.last_contact_at ? new Date(p.last_contact_at).toISOString() : null,
    next_conversation_at: p.next_conversation_at ? new Date(p.next_conversation_at).toISOString() : null,
    needs: p.needs.length,
    test: p.test,
  };
}

/**
 * Pure: Today, ranked. Each item says what to do, why, and where to do it.
 * Priority: 1 now, 2 today, 3 this week, 4 when there is a moment.
 */
export function buildTodayItems({ people = [], emailsWaiting = [], teamQuestions = [], unmatched = [], now = Date.now() }) {
  const items = [];
  const today = chicagoDay(now);
  const tomorrow = chicagoDay(now + DAY);

  for (const e of emailsWaiting) {
    items.push({
      key: `email:${e.id}`,
      priority: 1,
      kind: 'approve_email',
      title: `Approve ${e.agent_name}'s email to ${e.to_name || e.to_email}`,
      why: e.subject,
      email: e.to_email,
      go: '/ao/analyst?queue=1',
    });
  }
  for (const t of teamQuestions) {
    items.push({
      key: `task:${t.id}`,
      priority: 1,
      kind: 'answer_team',
      title: `${t.agent_name} needs you`,
      why: t.question || t.title,
      go: t.thread_id ? `/ao/analyst?thread=${t.thread_id}` : '/ao/analyst',
    });
  }

  for (const p of people) {
    if (p.test) continue;
    const first = String(p.name || '').split(/\s+/)[0] || p.email;
    const owed = replyOwed(p, now);
    if (owed) {
      items.push({
        key: `reply:${p.email}`,
        priority: owed.days >= 2 ? 1 : 2,
        kind: 'reply',
        title: `Reply to ${p.name}`,
        why: `${owed.days === 0 ? 'Wrote today' : owed.days === 1 ? 'Wrote yesterday' : `Wrote ${owed.days} days ago`}${owed.subject ? `: ${owed.subject}` : ''}`,
        email: p.email,
      });
    }
    const next = nextStepOf(p);
    if (next && next.owner === 'bart') {
      const due = next.due ? String(next.due).slice(0, 10) : null;
      const overdue = due && due < today;
      if (!due || due <= tomorrow) {
        items.push({
          key: `next:${p.email}`,
          priority: overdue ? 1 : due === today ? 2 : 3,
          kind: 'next_step',
          title: next.what,
          why: `${p.name}${due ? `, ${overdue ? 'was due' : 'due'} ${due === today ? 'today' : due === tomorrow ? 'tomorrow' : due}` : ''}`,
          email: p.email,
        });
      }
    }
    if (p.next_conversation_at) {
      const at = Date.parse(p.next_conversation_at);
      const day = chicagoDay(at);
      if (day === today || day === tomorrow) {
        const time = new Date(at).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
        items.push({
          key: `prep:${p.email}`,
          priority: day === today ? 1 : 2,
          kind: 'prepare',
          title: `Get ready for ${first}, ${day === today ? 'today' : 'tomorrow'} at ${time}`,
          why: 'Read their brief and what they wrote.',
          email: p.email,
        });
      }
    }
    for (const n of p.needs || []) {
      if (n.kind === 'gone_quiet') continue;
      items.push({
        key: `need:${p.email}:${n.kind}:${n.session_id || ''}`,
        priority: n.kind === 'archy_handoff' || n.kind === 'send_follow_up' ? 2 : 3,
        kind: n.kind,
        title: `${n.label}: ${p.name}`,
        why: null,
        email: p.email,
      });
    }
    if (p.quiet && !owed && !(next && next.owner === 'bart')) {
      items.push({
        key: `quiet:${p.email}`,
        priority: 3,
        kind: 'reach_out',
        title: `Reach out to ${first}`,
        why: `Quiet for ${p.quiet.days} days.`,
        email: p.email,
      });
    }
    const pod = (p.next_moves || []).find((m) => m.kind === 'schedule_podcast');
    if (pod) {
      items.push({ key: `pod:${p.email}`, priority: 4, kind: 'schedule_podcast', title: pod.label, why: pod.why, email: p.email });
    }
  }

  if (unmatched.length) {
    items.push({
      key: 'unmatched',
      priority: 3,
      kind: 'match_transcript',
      title: `Match ${unmatched.length === 1 ? 'a transcript' : `${unmatched.length} transcripts`} to the right person`,
      why: unmatched[0]?.topic || null,
      go: '/ao/crm?view=today#transcripts',
    });
  }

  // One line per person per kind; nearest and most urgent first.
  const seen = new Set();
  return items
    .filter((i) => (seen.has(i.key) ? false : seen.add(i.key)))
    .sort((a, b) => a.priority - b.priority);
}

async function teamInputs() {
  const out = { emailsWaiting: [], teamQuestions: [], unmatched: [] };
  try {
    const { listOutbox } = await import('../ao/team/outbox.js');
    const mail = await listOutbox();
    if (mail.ok) out.emailsWaiting = mail.waiting;
  } catch (_) {}
  try {
    const { listBoard } = await import('../ao/team/tasks.js');
    const board = await listBoard({ limit: 40 });
    if (board.ok) out.teamQuestions = board.needs_bart;
  } catch (_) {}
  try {
    const { listUnmatched } = await import('./transcriptIntake.js');
    out.unmatched = await listUnmatched();
  } catch (_) {}
  return out;
}

/** Today, for the screen and for Ask. */
export async function getToday(now = Date.now()) {
  const [people, inputs] = await Promise.all([listPeople(now), teamInputs()]);
  const items = buildTodayItems({ people, ...inputs, now });
  const byEmail = new Map(people.map((p) => [p.email, p]));
  return {
    ok: true,
    items: items.map((i) => ({ ...i, name: byEmail.get(i.email)?.name || null, phone: byEmail.get(i.email)?.phone || null })),
    counts: {
      people: people.filter((p) => !p.test).length,
      now: items.filter((i) => i.priority === 1).length,
      today: items.filter((i) => i.priority <= 2).length,
    },
    unmatched: inputs.unmatched,
  };
}

/** Everyone, newest activity first, with the CRM's fields. Filters are optional. */
export async function getPeople({ q = '', relationship = '', stage = '', quiet = false, owner = '' } = {}, now = Date.now()) {
  const people = await listPeople(now);
  const needle = String(q || '').trim().toLowerCase();
  let rows = people.filter((p) => !p.test).map((p) => crmRow(p, now));
  if (needle) rows = rows.filter((r) => [r.name, r.email, r.company, r.role].filter(Boolean).join(' ').toLowerCase().includes(needle));
  if (relationship) rows = rows.filter((r) => r.relationship === relationship);
  if (stage) rows = rows.filter((r) => r.stage === stage);
  if (quiet) rows = rows.filter((r) => r.quiet);
  if (owner) rows = rows.filter((r) => r.next_step?.owner === owner);
  const score = (r) => (r.reply_owed ? 4 : 0) + (r.next_step ? 2 : 0) + (r.quiet ? 1 : 0);
  rows.sort((a, b) => score(b) - score(a) || Date.parse(b.last_contact_at || 0) - Date.parse(a.last_contact_at || 0));
  return { ok: true, people: rows, relationships: RELATIONSHIPS, stages: STAGES, sources: SOURCES, owners: OWNERS, tiers: TIERS };
}

/** Everyone by stage, for the pipeline. */
export async function getPipeline(now = Date.now()) {
  const { people } = await getPeople({}, now);
  return {
    ok: true,
    stages: STAGES.map((s) => ({ ...s, people: people.filter((p) => p.stage === s.key) })),
  };
}

/** One person with the CRM's fields, for the person page and for Ask. */
export async function getCrmPerson(email, now = Date.now()) {
  const p = await getPerson(email, now);
  if (!p) return { ok: false, error: 'No one with that email is in the CRM.' };
  return {
    ok: true,
    person: { ...publicPerson(p), crm: crmRow(p, now), podcast: p.record?.flags?.podcast_guest || null },
    relationships: RELATIONSHIPS,
    sources: SOURCES,
    owners: OWNERS,
  };
}

/**
 * Change what the CRM knows about someone, on Bart's direction.
 * @param {string} email
 * @param {{ relationship?, source?, next_step?: {what, due, owner}|null, stage?, note? }} change
 */
export async function updateCrm(email, change = {}, { by = 'bart' } = {}) {
  const e = normEmail(email);
  if (!e) return { ok: false, error: 'email is required' };
  const record = await getClientRecord(e);
  const crm = { ...(record?.crm && typeof record.crm === 'object' ? record.crm : {}) };
  const fields = {};
  const changed = [];
  if (change.relationship !== undefined) {
    if (change.relationship && !RELATIONSHIP_KEYS.has(change.relationship)) return { ok: false, error: `relationship must be one of ${[...RELATIONSHIP_KEYS].join(', ')}` };
    crm.relationship = change.relationship || null;
    changed.push('relationship');
  }
  if (change.source !== undefined) {
    if (change.source && !SOURCE_KEYS.has(change.source)) return { ok: false, error: `source must be one of ${[...SOURCE_KEYS].join(', ')}` };
    crm.source = change.source || null;
    if (change.source_detail !== undefined) crm.source_detail = String(change.source_detail || '').slice(0, 200) || null;
    changed.push('source');
  }
  if (change.next_step !== undefined) {
    if (change.next_step === null || !String(change.next_step?.what || '').trim()) {
      crm.next_step = null;
    } else {
      const owner = OWNER_KEYS.has(change.next_step.owner) ? change.next_step.owner : 'bart';
      const due = change.next_step.due && /^\d{4}-\d{2}-\d{2}/.test(String(change.next_step.due)) ? String(change.next_step.due).slice(0, 10) : null;
      crm.next_step = { what: String(change.next_step.what).trim().slice(0, 300), due, owner, set_at: new Date().toISOString(), set_by: by };
    }
    changed.push('next step');
  }
  if (change.stage !== undefined) {
    if (!STAGES.some((s) => s.key === change.stage)) return { ok: false, error: 'Unknown stage' };
    fields.stage = change.stage;
    changed.push('stage');
  }
  if (!changed.length && !change.note) return { ok: false, error: 'Nothing to change' };
  if (changed.length) {
    await upsertClientRecord(e, { ...fields, crm, ...(record ? {} : { name: change.name || e }) });
  }
  if (change.note) {
    await addEvent({ email: e, kind: 'note', subject: 'Note', body: String(change.note).slice(0, 4000), meta: { by } });
    changed.push('note');
  }
  // A next step owned by a teammate is their work: hand it to them now.
  let handed = null;
  const step = crm.next_step;
  if (change.next_step !== undefined && step && step.owner !== 'bart') {
    try {
      const { createTask } = await import('../ao/team/tasks.js');
      const { kickTask } = await import('../ao/team/runTask.js');
      const name = record?.name || change.name || e;
      const out = await createTask({
        agent: step.owner,
        title: `${name}: ${step.what}`.slice(0, 140),
        brief: [
          `Next step in the CRM for ${name} (${e}): ${step.what}.${step.due ? ` Due ${step.due}.` : ''}`,
          'Read their record with crm_person first. Do the step, or get it as far as you can; anything that goes to them is an email drafted with draft_email for Bart to approve.',
          'When it is done, clear or update the next step with crm_update, then call task_update with status "done" and a one-line summary.',
        ].join('\n'),
        assignedBy: by,
        maxPasses: 4,
      });
      if (out.ok) {
        await kickTask(out.task.id);
        handed = { agent: step.owner, task_id: out.task.id };
      }
    } catch (err) {
      console.warn('[crm] could not hand the next step to a teammate:', err?.message || err);
    }
  }
  return { ok: true, email: e, changed, crm, handed };
}

/** A person who is not in the CRM yet, added by hand. */
export async function addContact({ email, name, phone = null, relationship = 'contact', source = null, note = null }) {
  const e = normEmail(email);
  if (!e || !/@/.test(e)) return { ok: false, error: 'A valid email is required' };
  const existing = await getClientRecord(e);
  if (existing) return { ok: false, error: `${existing.name || e} is already in the CRM.` };
  await upsertClientRecord(e, {
    name: String(name || '').trim() || e,
    phone: phone || null,
    stage: 'contact',
    crm: { relationship: RELATIONSHIP_KEYS.has(relationship) ? relationship : 'contact', source: SOURCE_KEYS.has(source) ? source : null },
  });
  await supabaseAdmin.from('ao_client_events').insert({
    client_email: e,
    kind: 'note',
    subject: 'Added to the CRM',
    body: note ? String(note).slice(0, 4000) : null,
    meta: { by: 'bart' },
    at: new Date().toISOString(),
  });
  return { ok: true, email: e };
}
