import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { EPISODE_VIDEO_BUCKET, ensureEpisodeVideoBucket } from './episodeVideoStorage.js';

const ALLOWED_CLIP_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

function safeFileName(name) {
  return String(name || 'episode-clip.mp4')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'episode-clip.mp4';
}

/**
 * Mint a signed upload URL for a short Riverside clip (same bucket, clips/ prefix).
 * Scaffolding only — not wired into Auto's main approval flow yet.
 */
export async function createEpisodeClipUploadTarget({ email, fileName, mimeType, episode_slug = '' }) {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (!ALLOWED_CLIP_MIME.includes(normalizedMime)) {
    return { ok: false, error: 'Unsupported clip type. Use MP4, MOV, or WEBM.' };
  }

  await ensureEpisodeVideoBucket();
  const bucket = EPISODE_VIDEO_BUCKET;
  const owner = String(email || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-');
  const slugPart = String(episode_slug || 'clip')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 60) || 'clip';
  const storagePath = `clips/${owner}/${slugPart}/${crypto.randomUUID()}-${safeFileName(fileName)}`;

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.signedUrl) {
    return {
      ok: false,
      error: signed.error?.message || 'Could not create clip upload URL.',
    };
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);

  return {
    ok: true,
    bucket,
    storage_path: storagePath,
    upload_url: signed.data.signedUrl,
    token: signed.data.token,
    public_url: pub?.publicUrl || null,
  };
}
