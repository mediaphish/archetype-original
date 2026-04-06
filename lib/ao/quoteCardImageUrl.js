/**
 * Turn quote card SVG into a public PNG URL (Supabase storage) for social APIs
 * that require a real image link (Instagram, Facebook, LinkedIn, X media).
 */

import crypto from 'crypto';
import sharp from 'sharp';
import { supabaseAdmin } from '../supabase-admin.js';

const BUCKET = 'ao-auto-attachments';

async function ensureBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === BUCKET);
    if (exists) return BUCKET;
    const created = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 8 * 1024 * 1024,
    });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) {
      throw created.error;
    }
    return BUCKET;
  } catch {
    return BUCKET;
  }
}

/**
 * Rasterize SVG to PNG (1080×1080) and upload to public storage.
 * @param {string} svgString - full SVG markup
 * @param {{ subfolder?: string }} [opts]
 * @returns {Promise<{ ok: true, publicUrl: string } | { ok: false, error: string }>}
 */
export async function uploadQuoteCardSvgToPublicUrl(svgString, opts = {}) {
  const subfolder = String(opts.subfolder || 'quote-cards').replace(/^\/+|\/+$/g, '') || 'quote-cards';
  if (!svgString || typeof svgString !== 'string' || svgString.length < 20) {
    return { ok: false, error: 'Invalid or empty SVG' };
  }

  let png;
  try {
    // Higher density helps SVG text/layout resolve more crisply before resize to 1080.
    png = await sharp(Buffer.from(svgString, 'utf8'), { density: 144 })
      .resize(1080, 1080, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not rasterize quote card' };
  }

  if (!png?.length) {
    return { ok: false, error: 'Empty PNG buffer' };
  }

  const bucket = await ensureBucket();
  const path = `${subfolder}/${crypto.randomUUID()}.png`;
  const upload = await supabaseAdmin.storage.from(bucket).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  });
  if (upload.error) {
    return { ok: false, error: upload.error.message || 'Upload failed' };
  }
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub?.publicUrl || null;
  if (!publicUrl || !String(publicUrl).startsWith('https://')) {
    return { ok: false, error: 'No public URL after upload' };
  }
  return { ok: true, publicUrl };
}
