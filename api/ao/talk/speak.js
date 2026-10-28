/**
 * POST /api/ao/talk/speak { agent, text } -> audio/mpeg
 * A teammate's line read aloud during a live talk. See lib/ao/talkVoice.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { speak } from '../../../lib/ao/talkVoice.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const out = await speak(String(body.agent || 'auto'), String(body.text || ''));
  if (!out.ok) return res.status(502).json(out);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(out.audio);
}
