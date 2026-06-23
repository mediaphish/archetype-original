import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { archiveAutoThread } from '../../../../lib/ao/autoHub.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const threadId = safeText(req.body?.thread_id, 80);
  if (!threadId) {
    return res.status(400).json({ ok: false, error: 'thread_id required' });
  }

  try {
    const thread = await archiveAutoThread(auth.email, threadId);
    return res.status(200).json({ ok: true, thread });
  } catch (e) {
    const msg = e.message || 'Could not archive chat';
    const code = /not found/i.test(msg) ? 404 : 500;
    return res.status(code).json({ ok: false, error: msg });
  }
}
