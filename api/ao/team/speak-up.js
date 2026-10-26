/**
 * POST { thread_id } -> who on the team has something real to add to the last
 * reply (lib/ao/team/speakUp.js). The screen then gives each of them a turn.
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { whoSpeaksUp } from '../../../lib/ao/team/speakUp.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    return res.status(200).json(await whoSpeaksUp({ owner: auth.email, threadId: String(req.body?.thread_id || '') }));
  } catch (err) {
    console.error('[speak-up]', err?.message || err);
    return res.status(200).json({ ok: true, speakers: [] });
  }
}
