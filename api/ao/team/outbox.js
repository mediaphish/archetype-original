/**
 * Emails the team wrote, for Bart's Queue.
 * GET: waiting on Bart, on their way, recently sent.
 * POST { action: 'approve', id, subject?, body? } | { action: 'discard', id }
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { listOutbox, approveEmail, discardEmail, checkAgainstRecord } from '../../../lib/ao/team/outbox.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await listOutbox());
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = req.body || {};
    const id = String(body.id || '');
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    if (body.action === 'approve') return res.status(200).json(await approveEmail(id, { subject: body.subject, body: body.body }));
    if (body.action === 'discard') return res.status(200).json(await discardEmail(id));
    if (body.action === 'recheck') {
      const { data: row } = await supabaseAdmin.from('ao_team_outbox').select('id, to_email, subject, body, status').eq('id', id).maybeSingle();
      if (!row || row.status !== 'pending_review') return res.status(400).json({ ok: false, error: 'That email is no longer waiting.' });
      const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : row.subject;
      const text = typeof body.body === 'string' && body.body.trim() ? body.body.trim() : row.body;
      const accuracy = await checkAgainstRecord({ to: row.to_email, subject, body: text });
      await supabaseAdmin.from('ao_team_outbox').update({ accuracy, subject, body: text, updated_at: new Date().toISOString() }).eq('id', id);
      return res.status(200).json({ ok: true, accuracy });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error('[team/outbox]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
