import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { renameAutoThread } from '../../../../lib/ao/autoHub.js';

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
  const title = safeText(req.body?.title, 200);
  if (!threadId) {
    return res.status(400).json({ ok: false, error: 'thread_id required' });
  }
  if (!title) {
    return res.status(400).json({ ok: false, error: 'title required' });
  }

  try {
    const thread = await renameAutoThread(auth.email, threadId, title);
    return res.status(200).json({ ok: true, thread });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Could not rename chat' });
  }
}
