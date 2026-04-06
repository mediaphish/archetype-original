import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { saveDraftAndStartFresh, getAutoThreadState } from '../../../../lib/ao/autoHub.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const thread = await saveDraftAndStartFresh(auth.email, { title });
    const state = await getAutoThreadState(auth.email, thread.id);
    return res.status(200).json({
      ok: true,
      thread: state.thread,
      messages: state.messages,
      attachments: state.attachments,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Could not save draft' });
  }
}
