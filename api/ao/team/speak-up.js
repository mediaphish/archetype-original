/**
 * POST { thread_id } -> who on the team has something real to add to the last
 * reply (lib/ao/team/speakUp.js). The screen then gives each of them a turn.
 */
import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { whoSpeaksUp } from '../../../lib/ao/team/speakUp.js';
import { startHuddle } from '../../../lib/ao/team/huddle.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const threadId = String(req.body?.thread_id || '');
    const up = await whoSpeaksUp({ owner: auth.email, threadId });
    // Someone has something real to add: the team huddles in the thread
    // instead of each speaking past the other (2026-10-26).
    if (up.ok && up.speakers?.length) {
      const first = up.speakers[0];
      const started = await startHuddle({ owner: auth.email, threadId, opener: { agent: first.agent, to: up.answered_by || 'auto', note: first.note } });
      return res.status(200).json({ ...up, huddle: Boolean(started.ok) });
    }
    return res.status(200).json(up);
  } catch (err) {
    console.error('[speak-up]', err?.message || err);
    return res.status(200).json({ ok: true, speakers: [] });
  }
}
