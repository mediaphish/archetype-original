/**
 * Channels for Auto's chat (lib/ao/team/channels.js).
 *
 * GET                                   the channels
 * POST { action: 'create', name, lead?, purpose? }
 * POST { action: 'archive', key }
 * POST { action: 'move', thread_id, key }
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { listChannels, createChannel, archiveChannel, moveThread } from '../../lib/ao/team/channels.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await listChannels(auth.email));
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const b = req.body || {};
    if (b.action === 'create') return res.status(200).json(await createChannel(auth.email, b));
    if (b.action === 'archive') return res.status(200).json(await archiveChannel(auth.email, String(b.key || '')));
    if (b.action === 'move') return res.status(200).json(await moveThread(auth.email, String(b.thread_id || ''), String(b.key || '')));
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error('[channels]', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Could not load channels' });
  }
}
