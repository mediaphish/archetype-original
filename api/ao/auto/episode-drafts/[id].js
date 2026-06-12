/**
 * PATCH /api/ao/auto/episode-drafts/[id]
 * Update episode draft fields before publish.
 */

import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { updateEpisodeDraftForUser } from '../../../../lib/ao/episodeDraftStore.js';
import { sanitizeEpisodeFields } from '../../../../lib/ao/episodeVoiceSanitize.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const draftId = String(req.query?.id || '').trim();
  if (!draftId) {
    return res.status(400).json({ ok: false, error: 'draft id required' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const patch = sanitizeEpisodeFields(body);

  try {
    const updated = await updateEpisodeDraftForUser(draftId, auth.email, patch);
    if (!updated.ok) {
      const status = updated.error === 'draft_not_found' ? 404 : 500;
      return res.status(status).json({ ok: false, error: updated.error });
    }
    return res.status(200).json({ ok: true, draft: updated.draft });
  } catch (e) {
    console.error('[episode-drafts/patch]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
}
