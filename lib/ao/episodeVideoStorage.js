import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

export const EPISODE_VIDEO_BUCKET = 'ao-episode-video';

const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
];

export async function ensureEpisodeVideoBucket() {
  const bucket = EPISODE_VIDEO_BUCKET;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === bucket);
    if (exists) return bucket;

    const created = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ALLOWED_VIDEO_MIME,
      fileSizeLimit: 2 * 1024 * 1024 * 1024,
    });

    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) {
      throw created.error;
    }
    return bucket;
  } catch (err) {
    console.warn('[episodeVideoStorage] ensure bucket:', err?.message || err);
    return bucket;
  }
}

function safeFileName(name) {
  return String(name || 'episode-video.mp4')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'episode-video.mp4';
}

/**
 * Mint a signed upload URL so Auto can upload a large video directly to Supabase Storage.
 */
export async function createEpisodeVideoUploadTarget({ email, fileName, mimeType }) {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (!ALLOWED_VIDEO_MIME.includes(normalizedMime)) {
    return { ok: false, error: 'Unsupported video type. Use MP4, MOV, WEBM, or AVI.' };
  }

  await ensureEpisodeVideoBucket();
  const bucket = EPISODE_VIDEO_BUCKET;
  const owner = String(email || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-');
  const storagePath = `episodes/${owner}/${crypto.randomUUID()}-${safeFileName(fileName)}`;

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.signedUrl) {
    return {
      ok: false,
      error: signed.error?.message || 'Could not create video upload URL.',
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
