/**
 * The Gmail sync's door into the site (see lib/calendly/gmailSync.js).
 *
 * GET  /api/ao/gmail            the client addresses to look for
 * POST /api/ao/gmail {messages} file messages on client timelines
 * POST /api/ao/gmail {transcripts} transcripts Bart emailed to bart+transcripts@
 *
 * Only Bart's own Apps Script can use it: every call carries a Google-signed
 * identity token, checked with Google, that must belong to Bart.
 */

import { verifiedGoogleEmail, isOwner, clientAddresses, ingestMessages } from '../../lib/calendly/gmailSync.js';
import { sendToBart } from '../../lib/calendly/followups.js';
import { queueIncoming, emailedSource } from '../../lib/calendly/transcriptIntake.js';
import { noticeHtml } from '../../lib/calendly/emailLayout.js';

const SITE = process.env.SITE_BASE_URL || 'https://www.archetypeoriginal.com';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const who = await verifiedGoogleEmail(token);
  if (!who || !isOwner(who)) return res.status(401).json({ ok: false, error: 'Not Bart' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, addresses: await clientAddresses() });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = await readJson(req);
    // Wispr Flow and Echo transcripts Bart emailed to bart+transcripts@: read on the next 15-minute run.
    if (Array.isArray(body.transcripts)) {
      let kept = 0;
      for (const t of body.transcripts.slice(0, 20)) {
        if (String(t.text || '').trim().length < 200) continue;
        await queueIncoming({
          source: emailedSource(t.subject, t.text),
          externalId: String(t.id || ''),
          startedAt: t.date || null,
          topic: String(t.subject || '').slice(0, 300) || null,
          transcript: String(t.text),
        });
        kept += 1;
      }
      return res.status(200).json({ ok: true, kept });
    }
    const result = await ingestMessages(body.messages);
    for (const h of result.held) {
      const day = new Date(h.send_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
      await sendToBart({
        subject: `${h.name} wrote to you. I held the next check-in.`,
        html: noticeHtml({
          title: `${h.name} wrote to you`,
          lines: [`The check-in planned for ${day} is on hold so it does not cross their note.`, 'Edit it, send it on its date anyway, or leave it held.'],
          cta: { label: 'Open Clients in Auto', url: `${SITE}/ao/clients` },
        }),
      });
    }
    if (result.filed.length) console.log('[gmail]', JSON.stringify({ filed: result.filed.length, held: result.held.length }));
    return res.status(200).json({ ok: true, filed: result.filed.length, held: result.held.length });
  } catch (err) {
    console.error('[gmail] failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'failed' });
  }
}
