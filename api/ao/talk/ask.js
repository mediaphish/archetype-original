/**
 * POST /api/ao/talk/ask { agent, text, slug?, section_id? } -> { ok, agent, reply }
 * A teammate's short spoken reply to Bart on stage. See lib/ao/talkAsk.js.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { talkReply } from '../../../lib/ao/talkAsk.js';
import { getTalk } from '../../../lib/ao/talks.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const talk = body.slug ? await getTalk(String(body.slug)) : null;
  const section = talk?.sections?.find((s) => s.id === body.section_id) || null;
  const out = await talkReply({ agent: String(body.agent || 'auto'), text: body.text, talk, section });
  return res.status(out.ok ? 200 : 502).json(out);
}
