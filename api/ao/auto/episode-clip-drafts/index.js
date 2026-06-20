/**
 * POST /api/ao/auto/episode-clip-drafts
 *
 * Scaffolding only — clip caption pipeline not wired into Auto's main UI yet.
 * Body: { parent_episode_slug?, parent_episode_draft_id?, clip_video_url?, clip_hint?, episode_title?, episode_url? }
 */

import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import {
  insertEpisodeClipDraft,
  proposeEpisodeClipCaption,
} from '../../../../lib/ao/episodeClipDraftStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  try {
    const inserted = await insertEpisodeClipDraft(auth.email, {
      parent_episode_slug: body.parent_episode_slug || null,
      parent_episode_draft_id: body.parent_episode_draft_id || null,
      clip_video_url: body.clip_video_url || null,
      storage_path: body.storage_path || null,
      clip_hint: body.clip_hint || '',
    });

    if (!inserted.ok) {
      return res.status(inserted.error === 'episode_clip_drafts_table_missing' ? 503 : 400).json(inserted);
    }

    const withCaption = await proposeEpisodeClipCaption({
      clipDraftId: inserted.clip_draft.clip_draft_id,
      email: auth.email,
      episode_title: body.episode_title || '',
      episode_url: body.episode_url || '',
      clip_hint: body.clip_hint || '',
    });

    if (!withCaption.ok) {
      return res.status(200).json({
        ok: true,
        clip_draft: inserted.clip_draft,
        caption_generated: false,
        message: 'Clip draft created. Caption generation failed — edit manually.',
      });
    }

    return res.status(200).json({
      ok: true,
      clip_draft: withCaption.clip_draft,
      caption_generated: true,
      message: 'Clip draft created with proposed caption. Approval required before posting.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
