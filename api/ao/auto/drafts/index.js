import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { listArchivedAutoThreads } from '../../../../lib/ao/autoHub.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const drafts = await listArchivedAutoThreads(auth.email, { limit: 50 });
    return res.status(200).json({ ok: true, drafts });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Could not load drafts' });
  }
}
