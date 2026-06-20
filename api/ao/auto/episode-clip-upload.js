/**
 * POST /api/ao/auto/episode-clip-upload
 *
 * Scaffolding only — mint signed upload URL for a Riverside clip export.
 * Body: { file_name, mime_type, episode_slug? }
 */

import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { createEpisodeClipUploadTarget } from '../../../../lib/ao/episodeClipStorage.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const fileName = String(body.file_name || '').trim();
  const mimeType = String(body.mime_type || 'video/mp4').trim();

  if (!fileName) {
    return res.status(400).json({ ok: false, error: 'file_name is required.' });
  }

  const result = await createEpisodeClipUploadTarget({
    email: auth.email,
    fileName,
    mimeType,
    episode_slug: body.episode_slug || '',
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.status(200).json({
    ok: true,
    upload_url: result.upload_url,
    public_url: result.public_url,
    storage_path: result.storage_path,
    bucket: result.bucket,
  });
}
