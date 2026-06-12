/**
 * POST /api/podcast/guest-intake-upload
 * Mint a signed Supabase upload URL for guest headshot/logo images.
 */

import { createGuestImageUploadTarget } from '../../lib/ao/guestImageStorage.js';

export default async function handler(req, res) {
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
    const created = await createGuestImageUploadTarget({ fileName, mimeType });
    if (!created.ok) {
      return res.status(400).json({ ok: false, error: created.error });
    }

    return res.status(200).json({
      ok: true,
      upload_url: created.upload_url,
      token: created.token,
      public_url: created.public_url,
      storage_path: created.storage_path,
    });
  } catch (err) {
    console.error('[guest-intake-upload]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
