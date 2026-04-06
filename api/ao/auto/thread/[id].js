import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { deleteAutoThread } from '../../../../lib/ao/autoHub.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    await deleteAutoThread(auth.email, id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    const msg = e.message || 'Could not delete draft';
    const code = /active conversation|not found/i.test(msg) ? 400 : 500;
    return res.status(code).json({ ok: false, error: msg });
  }
}
