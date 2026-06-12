/**
 * POST /api/ao/auto/episode-video-upload
 *
 * Body: { file_name: string, mime_type: string }
 * Returns a signed Supabase upload URL and the eventual public URL for video_source_url.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { createEpisodeVideoUploadTarget } from '../../../lib/ao/episodeVideoStorage.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const fileName = String(body.file_name || '').trim();
  const mimeType = String(body.mime_type || '').trim();

  if (!fileName || !mimeType) {
    return res.status(400).json({ ok: false, error: 'file_name and mime_type are required.' });
  }

  try {
    const created = await createEpisodeVideoUploadTarget({
      email: auth.email,
      fileName,
      mimeType,
    });

    if (!created.ok) {
      return res.status(400).json({ ok: false, error: created.error });
    }

    return res.status(200).json({
      ok: true,
      upload_url: created.upload_url,
      token: created.token,
      public_url: created.public_url,
      storage_path: created.storage_path,
      message:
        'Upload the video file with PUT to upload_url, then use public_url as video_source_url when publishing.',
    });
  } catch (err) {
    console.error('[episode-video-upload]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
