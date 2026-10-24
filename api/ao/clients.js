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
 *
 * GET ?timeline=<email>                that person's timeline
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
import {
  cleanTranscript,
  analyzeTranscript,
  saveTranscript,
  planFrom,
} from '../../lib/calendly/transcripts.js';
import {
  getBooking,
  markRow,
  researchAndStore,
  draftAndStore,
  sendToClient,
  reinviteEmail,
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
      if (req.query?.timeline) {
        return res.status(200).json({ ok: true, events: await listEvents(String(req.query.timeline)) });
      }
      return res.status(200).json({ ok: true, stages: STAGES, clients: await listClients() });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = await readJson(req);
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
        if (consentOf(record, 'record') === 'no') {
          return res.status(403).json({ ok: false, error: `${row.name} said no to recording, so transcripts are off for them.` });
        }
        const transcript = cleanTranscript(body.text);
        if (transcript.length < 200) return res.status(400).json({ ok: false, error: 'That transcript looks empty or too short.' });
        const result = await analyzeTranscript(row, transcript);
        if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
        await saveTranscript(row, transcript, result.analysis);
        const a = row.answers || {};
        await markRow(row, {
          transcript_at: now,
          transcript_analysis: result.analysis,
          // A thank-you that has not gone out yet is replaced by one built from the real conversation.
          ...(a.thank_you_sent_at ? {} : { thank_you_draft: result.analysis.thank_you, followup_drafted_at: now }),
          checkin_plan: planFrom(result.analysis, a.scheduled_for),
          checkins_stopped_at: null,
        });
        await addEvent({
          email,
          inquiryId: row.id,
          kind: 'transcript_added',
          body: result.analysis.summary,
          meta: { action_items: result.analysis.action_items },
        });
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
          item.id === body.item_id && item.status === 'draft' ? { ...item, status: 'approved', approved_at: now } : item
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
