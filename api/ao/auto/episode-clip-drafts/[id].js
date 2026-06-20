/**
 * GET/PATCH /api/ao/auto/episode-clip-drafts/:id
 *
 * Scaffolding only — not wired into Auto's main UI yet.
 */

import { requireAoSession } from '../../../../../lib/ao/requireAoSession.js';
import {
  getEpisodeClipDraftForUser,
  updateEpisodeClipDraftForUser,
  proposeEpisodeClipCaption,
} from '../../../../../lib/ao/episodeClipDraftStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const clipDraftId = String(req.query?.id || '').trim();
  if (!clipDraftId) {
    return res.status(400).json({ ok: false, error: 'Clip draft id is required.' });
  }

  if (req.method === 'GET') {
    const loaded = await getEpisodeClipDraftForUser(clipDraftId, auth.email);
    if (!loaded.ok) {
      return res.status(loaded.error === 'clip_draft_not_found' ? 404 : 400).json(loaded);
    }
    return res.status(200).json({ ok: true, clip_draft: loaded.clip_draft });
  }

  if (req.method === 'PATCH') {
    const body = typeof req.body === 'object' && req.body ? req.body : {};

    if (body.regenerate_caption) {
      const result = await proposeEpisodeClipCaption({
        clipDraftId,
        email: auth.email,
        episode_title: body.episode_title || '',
        episode_url: body.episode_url || '',
        clip_hint: body.clip_hint || '',
      });
      if (!result.ok) {
        return res.status(400).json(result);
      }
      return res.status(200).json({ ok: true, clip_draft: result.clip_draft });
    }

    const patch = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.caption !== undefined) patch.caption = body.caption;
    if (body.hashtags !== undefined) patch.hashtags = body.hashtags;
    if (body.cta !== undefined) patch.cta = body.cta;
    if (body.clip_hint !== undefined) patch.clip_hint = body.clip_hint;
    if (body.clip_video_url !== undefined) patch.clip_video_url = body.clip_video_url;

    const updated = await updateEpisodeClipDraftForUser(clipDraftId, auth.email, patch);
    if (!updated.ok) {
      return res.status(updated.error === 'clip_draft_not_found' ? 404 : 400).json(updated);
    }
    return res.status(200).json({ ok: true, clip_draft: updated.clip_draft });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
