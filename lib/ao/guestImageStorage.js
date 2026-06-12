import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

export const GUEST_IMAGE_BUCKET = 'ao-podcast-guest-images';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function ensureGuestImageBucket() {
  const bucket = GUEST_IMAGE_BUCKET;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === bucket);
    if (exists) return bucket;

    const created = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ALLOWED_IMAGE_MIME,
      fileSizeLimit: 10 * 1024 * 1024,
    });

    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) {
      throw created.error;
    }
    return bucket;
  } catch (err) {
    console.warn('[guestImageStorage] ensure bucket:', err?.message || err);
    return bucket;
  }
}

function safeFileName(name) {
  return String(name || 'guest-image.jpg')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'guest-image.jpg';
}

export async function createGuestImageUploadTarget({ fileName, mimeType }) {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(normalizedMime)) {
    return { ok: false, error: 'Use a JPG, PNG, or WEBP image up to 10MB.' };
  }

  await ensureGuestImageBucket();
  const bucket = GUEST_IMAGE_BUCKET;
  const storagePath = `intake/${crypto.randomUUID()}-${safeFileName(fileName)}`;

  const signed = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.signedUrl) {
    return {
      ok: false,
      error: signed.error?.message || 'Could not create image upload URL.',
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
