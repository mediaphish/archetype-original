/**
 * Emails the team wrote, for Bart's Queue.
 * GET: waiting on Bart, on their way, recently sent.
 * POST { action: 'approve', id, subject?, body? } | { action: 'discard', id }
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { listOutbox, approveEmail, discardEmail } from '../../../lib/ao/team/outbox.js';

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
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error('[team/outbox]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
