import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { setDesignImagesClearedAt } from '../../../lib/ao/autoHub.js';

/**
 * POST /api/ao/auto/thread-clear-design-images
 *
 * Persists the Clear timestamp for the Generated Images panel onto the
 * thread itself, so it survives a page reload instead of living only in a
 * browser-tab React ref. Body: { thread_id: string }
 */
export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const threadId = String(req.body?.thread_id || '').trim();
  if (!threadId) {
    return res.status(400).json({ ok: false, error: 'thread_id is required' });
  }

  try {
    const clearedAtIso = new Date().toISOString();
    const updated = await setDesignImagesClearedAt(auth.email, threadId, clearedAtIso);
    return res.status(200).json({ ok: true, cleared_at: clearedAtIso, thread_id: updated.id });
  } catch (err) {
    console.error('[thread-clear-design-images]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Could not save clear state' });
  }
}
