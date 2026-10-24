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
 *
 * Owner session only. Nothing reaches a client except through 'send', which
 * only Bart can press. See lib/calendly/clients.js and followups.js.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { listClients, toClient, isStage, STAGES } from '../../lib/calendly/clients.js';
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
      return res.status(200).json({ ok: true, stages: STAGES, clients: await listClients() });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = await readJson(req);
    const row = await getBooking(String(body.id || ''));
    if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
    const now = new Date().toISOString();

    switch (body.action) {
      case 'stage': {
        if (!isStage(body.stage)) return res.status(400).json({ ok: false, error: 'Unknown stage' });
        await markRow(row, { stage: body.stage, stage_at: now });
        break;
      }
      case 'notes': {
        await markRow(row, { notes: String(body.notes || '').slice(0, 20000), notes_at: now });
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
        const sent = await sendToClient(row, { subject, text });
        if (!sent.ok) return res.status(502).json({ ok: false, error: `Not sent: ${sent.error}` });
        await markRow(
          row,
          kind === 'reinvite'
            ? { reinvite_sent_at: now, reinvite_text: text }
            : { thank_you_sent_at: now, thank_you_text: text, stage: a.stage || 'met' }
        );
        break;
      }
      default:
        return res.status(400).json({ ok: false, error: 'Unknown action' });
    }
    return res.status(200).json({ ok: true, client: toClient(row) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Clients request failed' });
  }
}
