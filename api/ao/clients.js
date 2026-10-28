/**
 * AO Automation — Clients (Auto > Clients).
 *
 * GET  /api/ao/clients                 everyone, with stage and what is waiting
 * POST /api/ao/clients {action, id, …}
 *   stage     { stage }                move someone (booked, met, season, ongoing, not_now)
 *   notes     { notes }                Bart's notes on the conversation
 *   research                           run the research brief again
 *   draft                              draft (or redraft) the thank-you
 *   send      { kind, subject, text }  send the thank-you or the re-invite, as written
 *   dismiss                            no follow-up needed for this one
 *   transcript { text }                read a transcript: summary, action items,
 *                                      thank-you with real points, check-in plan
 *   plan_update { items }              edit check-in wording or dates
 *   plan_approve { item_id }           approve one check-in to send on its date
 *   plan_stop                          stop all check-ins for this conversation
 *   writing_links                      match Bart's action items to his published writing
 * POST {action:'incoming', incoming_id, inquiry_id | discard}  a transcript that came in on its own
 *
 * GET ?timeline=<email>                that person's timeline
 * GET ?view=home                       the CRM home: needs you, this week, coming up, everyone, numbers
 * GET ?person=<email>                  one person across all their conversations
 * GET ?archy=<email>                  that person's private Archy conversation
 * POST {action:'person', email, op, …} person-level changes: tier, stage, notes,
 *      details (add, update, remove, confirm), health override, thread, web watch
 *
 * Owner session only. Nothing reaches a client except through 'send', which
 * only Bart can press. See lib/calendly/clients.js and followups.js.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { listClients, toClient, isStage, STAGES } from '../../lib/calendly/clients.js';
import {
  getClientRecord,
  upsertClientRecord,
  listEvents,
  addEvent,
  consentOf,
  normEmail,
} from '../../lib/calendly/clientRecords.js';
import { history as archyHistory, newArchyLink, archyUrl, recordBartAnswer } from '../../lib/calendly/privateArchy.js';
import { takeTranscript, listUnmatched, resolveIncoming, readIncomingFor } from '../../lib/calendly/transcriptIntake.js';
import { homeView, getPerson, publicPerson } from '../../lib/calendly/people.js';
import { TIERS } from '../../lib/calendly/intelligence.js';
import { updateThread, runWebWatch } from '../../lib/calendly/thread.js';
import {
  getBooking,
  markRow,
  researchAndStore,
  draftAndStore,
  sendToClient,
  reinviteEmail,
  attachWritingLinks,
} from '../../lib/calendly/followups.js';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      if (req.query?.view === 'home') {
        const [home, unmatched] = await Promise.all([homeView(), listUnmatched().catch(() => [])]);
        return res.status(200).json({ ok: true, stages: STAGES, tiers: TIERS, ...home, unmatched });
      }
      if (req.query?.person) {
        const person = await getPerson(String(req.query.person));
        if (!person) return res.status(404).json({ ok: false, error: 'Not found' });
        return res.status(200).json({ ok: true, stages: STAGES, tiers: TIERS, person: publicPerson(person) });
      }
      if (req.query?.archy) {
        const email = normEmail(String(req.query.archy));
        const record = await getClientRecord(email);
        return res.status(200).json({
          ok: true,
          consent: consentOf(record, 'archy'),
          link_sent_at: record?.archy?.link_sent_at || null,
          // Owner only: Bart can open their Archy exactly as they see it.
          url: record?.archy?.link_sent_at ? archyUrl(email, Number(record.archy.link_version) || 1) : null,
          messages: await archyHistory(email),
        });
      }
      if (req.query?.timeline) {
        return res.status(200).json({ ok: true, events: await listEvents(String(req.query.timeline)) });
      }
      return res.status(200).json({ ok: true, stages: STAGES, clients: await listClients() });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = await readJson(req);
    if (body.action === 'person') return personAction(body, res);
    if (body.action === 'incoming') {
      // A transcript that arrived on its own and could not be matched: Bart picks the conversation, or sets it aside.
      if (body.discard) {
        await resolveIncoming(String(body.incoming_id || ''), { discard: true });
        return res.status(200).json({ ok: true });
      }
      const r = await readIncomingFor(String(body.incoming_id || ''), String(body.inquiry_id || ''));
      return res.status(r.ok ? 200 : r.status || 502).json(r.ok ? { ok: true } : { ok: false, error: r.error });
    }
    const row = await getBooking(String(body.id || ''));
    if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
    const now = new Date().toISOString();
    const email = normEmail(row.email);
    let record = await getClientRecord(email).catch(() => null);
    const ensureRecord = async (fields) => {
      record = await upsertClientRecord(email, { name: record?.name || row.name, ...fields });
    };

    switch (body.action) {
      case 'stage': {
        if (!isStage(body.stage)) return res.status(400).json({ ok: false, error: 'Unknown stage' });
        await markRow(row, { stage: body.stage, stage_at: now });
        await ensureRecord({ stage: body.stage });
        await addEvent({ email, inquiryId: row.id, kind: 'stage', subject: body.stage });
        break;
      }
      case 'notes': {
        const notes = String(body.notes || '').slice(0, 20000);
        await markRow(row, { notes, notes_at: now });
        await ensureRecord({ notes });
        break;
      }
      case 'research': {
        await researchAndStore(row);
        break;
      }
      case 'draft': {
        await draftAndStore(row);
        break;
      }
      case 'transcript': {
        const r = await takeTranscript(row, body.text, { source: 'pasted' });
        if (!r.ok) return res.status(r.status || 502).json({ ok: false, error: r.error });
        break;
      }
      case 'writing_links': {
        const r = await attachWritingLinks(row);
        if (!r.ok) return res.status(502).json({ ok: false, error: 'Could not look through your writing this time.' });
        break;
      }
      case 'plan_update': {
        const incoming = Array.isArray(body.items) ? body.items : [];
        const plan = (row.answers?.checkin_plan || []).map((item) => {
          const edit = incoming.find((x) => x.id === item.id);
          if (!edit || item.status === 'sent') return item;
          const sendAt = Date.parse(edit.send_at || '');
          return {
            ...item,
            subject: String(edit.subject ?? item.subject).slice(0, 200),
            text: String(edit.text ?? item.text).slice(0, 5000),
            send_at: Number.isFinite(sendAt) ? new Date(sendAt).toISOString() : item.send_at,
          };
        });
        await markRow(row, { checkin_plan: plan });
        break;
      }
      case 'plan_approve': {
        if (consentOf(record, 'checkins') === 'no') {
          return res.status(403).json({ ok: false, error: `${row.name} said no to check-ins.` });
        }
        const plan = (row.answers?.checkin_plan || []).map((item) =>
          // A held check-in (they wrote first) goes back to approved the same way.
          item.id === body.item_id && (item.status === 'draft' || item.status === 'held') ? { ...item, status: 'approved', approved_at: now } : item
        );
        await markRow(row, { checkin_plan: plan });
        break;
      }
      case 'plan_stop': {
        const plan = (row.answers?.checkin_plan || []).map((item) => (item.status === 'sent' ? item : { ...item, status: 'stopped' }));
        await markRow(row, { checkin_plan: plan, checkins_stopped_at: now });
        await addEvent({ email, inquiryId: row.id, kind: 'checkins_stopped' });
        break;
      }
      case 'dismiss': {
        await markRow(row, { followup_dismissed_at: now });
        break;
      }
      case 'send': {
        const kind = body.kind === 'reinvite' ? 'reinvite' : 'thank_you';
        const a = row.answers || {};
        if (a.thank_you_sent_at || a.reinvite_sent_at) {
          return res.status(409).json({ ok: false, error: 'A follow-up already went to this person.' });
        }
        const fallback = kind === 'reinvite' ? reinviteEmail(row) : { subject: 'Thank you', text: a.thank_you_draft || '' };
        const subject = String(body.subject || fallback.subject).trim().slice(0, 200);
        const text = String(body.text || fallback.text).trim().slice(0, 5000);
        if (!text) return res.status(400).json({ ok: false, error: 'The message is empty.' });
        const sent = await sendToClient(row, { subject, text }, { kind: kind === 'reinvite' ? 'reinvite_sent' : 'thank_you_sent' });
        if (!sent.ok) return res.status(502).json({ ok: false, error: `Not sent: ${sent.error}` });
        await markRow(
          row,
          kind === 'reinvite'
            ? { reinvite_sent_at: now, reinvite_text: text }
            : { thank_you_sent_at: now, thank_you_text: text, stage: a.stage || 'met', session_completed_at: now }
        );
        break;
      }
      default:
        return res.status(400).json({ ok: false, error: 'Unknown action' });
    }
    return res.status(200).json({ ok: true, client: toClient(row, Date.now(), record) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Clients request failed' });
  }
}

const DETAIL_KINDS = ['birthday', 'anniversary', 'family', 'decision', 'milestone', 'health', 'interest', 'other'];

function cleanDetail(d = {}) {
  const date = String(d.date || '').trim();
  return {
    kind: DETAIL_KINDS.includes(d.kind) ? d.kind : 'other',
    label: String(d.label || '').trim().slice(0, 300),
    date: /^(\d{4}-)?\d{2}-\d{2}$/.test(date) ? date : '',
    note: String(d.note || '').trim().slice(0, 1000),
  };
}

/** Changes that belong to the person, not one conversation. */
async function personAction(body, res) {
  const email = normEmail(body.email);
  const person = await getPerson(email);
  if (!person) return res.status(404).json({ ok: false, error: 'Not found' });
  const record = (await getClientRecord(email)) || {};
  const now = new Date().toISOString();
  const save = (fields) => upsertClientRecord(email, { name: record.name || person.name, ...fields });
  const details = Array.isArray(record.details) ? record.details : [];

  switch (body.op) {
    case 'tier': {
      const tier = TIERS.some((t) => t.key === body.tier) ? body.tier : null;
      await save({ tier });
      await addEvent({ email, kind: 'stage', subject: `tier: ${tier || 'none'}` });
      break;
    }
    case 'stage': {
      if (!isStage(body.stage)) return res.status(400).json({ ok: false, error: 'Unknown stage' });
      await save({ stage: body.stage });
      await addEvent({ email, kind: 'stage', subject: body.stage });
      break;
    }
    case 'notes': {
      await save({ notes: String(body.notes || '').slice(0, 20000) });
      break;
    }
    case 'log': {
      const { logConversation } = await import('../../lib/calendly/clientRecords.js');
      const out = await logConversation({ email, channel: body.channel, note: body.note, when: body.when || null });
      if (!out.ok) return res.status(400).json(out);
      break;
    }
    case 'detail_add': {
      const d = cleanDetail(body.detail);
      if (!d.label) return res.status(400).json({ ok: false, error: 'Add a few words about it.' });
      await save({ details: [...details, { id: `d${Date.now()}`, ...d, source: 'bart', status: 'confirmed', added_at: now }] });
      break;
    }
    case 'detail_update': {
      const d = cleanDetail(body.detail);
      await save({ details: details.map((x) => (x.id === body.detail?.id ? { ...x, ...d, status: 'confirmed', updated_at: now } : x)) });
      break;
    }
    case 'detail_confirm': {
      await save({ details: details.map((x) => (x.id === body.detail_id ? { ...x, status: 'confirmed', confirmed_at: now } : x)) });
      break;
    }
    case 'detail_remove': {
      await save({ details: details.filter((x) => x.id !== body.detail_id) });
      break;
    }
    case 'health_override': {
      const score = body.score === null || body.score === '' ? null : Math.max(0, Math.min(100, Math.round(Number(body.score))));
      const health = { ...(record.health || {}) };
      if (score === null || !Number.isFinite(score)) delete health.override;
      else health.override = { score, note: String(body.note || '').slice(0, 500), at: now };
      await save({ health });
      break;
    }
    case 'thread': {
      const r = await updateThread(email);
      if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
      break;
    }
    case 'web_watch': {
      const r = await runWebWatch(person);
      if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
      break;
    }
    case 'web_seen': {
      await save({ web_watch: { ...(record.web_watch || {}), unseen: false } });
      break;
    }
    // Private Archy. Nothing reaches the client until Bart presses Send.
    case 'archy_send_link':
    case 'archy_answer': {
      if (consentOf(record, 'archy') !== 'yes') return res.status(403).json({ ok: false, error: `${person.name} has not said yes to a private Archy.` });
      const row = person.rows.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      const text = String(body.text || '').trim();
      if (!row || !text) return res.status(400).json({ ok: false, error: 'Nothing to send.' });
      if (body.op === 'archy_send_link') {
        const url = await newArchyLink(email);
        const r = await sendToClient(row, { subject: String(body.subject || 'Your private Archy').slice(0, 200), text, cta: { label: 'Open your Archy', url } }, { kind: 'archy_link_sent' });
        if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
      } else {
        const fresh = await getClientRecord(email);
        const url = archyUrl(email, Number(fresh?.archy?.link_version) || 1);
        await recordBartAnswer(email, String(body.handoff_id || ''), text);
        const r = await sendToClient(row, { subject: 'About your question to Archy', text, cta: { label: 'Open your Archy', url } }, { kind: 'archy_answer_sent' });
        if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
      }
      break;
    }
    case 'archy_revoke': {
      const version = (Number(record.archy?.link_version) || 1) + 1;
      await save({ archy: { ...(record.archy || {}), link_version: version, link_sent_at: null } });
      break;
    }
    default:
      return res.status(400).json({ ok: false, error: 'Unknown change' });
  }
  const fresh = await getPerson(email);
  return res.status(200).json({ ok: true, person: publicPerson(fresh) });
}
