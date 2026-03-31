/**
 * AO Automation — Brand assets (logos)
 * GET  /api/ao/brand/assets
 * POST /api/ao/brand/assets  (multipart/form-data)
 *
 * Fields (POST):
 * - label (required)
 * - variant: mark | wordmark | lockup_light | lockup_dark | other
 * - defaultLight: "true" | "false"
 * - defaultDark: "true" | "false"
 * - file (required): SVG, PNG, or JPEG
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function parseBool(v) {
  const s = String(v || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
          return reject(new Error('Content-Type must be multipart/form-data'));
        }

        const boundary = contentType.split('boundary=')[1];
        if (!boundary) return reject(new Error('Invalid multipart data - no boundary'));

        const bodyString = buffer.toString('binary');

        const labelMatch = bodyString.match(/name="label"\r?\n\r?\n([^\r\n]+)/);
        const variantMatch = bodyString.match(/name="variant"\r?\n\r?\n([^\r\n]+)/);
        const defaultLightMatch = bodyString.match(/name="defaultLight"\r?\n\r?\n([^\r\n]+)/);
        const defaultDarkMatch = bodyString.match(/name="defaultDark"\r?\n\r?\n([^\r\n]+)/);

        const fileMatch = bodyString.match(/name="file"; filename="([^"]+)"\r?\nContent-Type: ([^\r\n]+)\r?\n\r?\n([\s\S]+?)(?=\r?\n--|$)/);
        if (!fileMatch) return reject(new Error('No file found in request'));

        const fileName = fileMatch[1];
        const fileType = fileMatch[2];
        const fileData = fileMatch[3];

        resolve({
          fields: {
            label: labelMatch ? labelMatch[1] : '',
            variant: variantMatch ? variantMatch[1] : '',
            defaultLight: defaultLightMatch ? defaultLightMatch[1] : '',
            defaultDark: defaultDarkMatch ? defaultDarkMatch[1] : '',
          },
          file: {
            originalname: fileName,
            mimetype: fileType,
            buffer: Buffer.from(fileData, 'binary'),
          },
        });
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function ensureBucket() {
  const bucket = 'ao-brand-assets';
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === bucket);
    if (exists) return bucket;
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/svg+xml', 'image/jpeg'],
      fileSizeLimit: 2 * 1024 * 1024,
    });
    if (error) {
      // If another request created it first, ignore.
      const msg = String(error.message || '');
      if (!msg.toLowerCase().includes('already exists')) throw error;
    }
    return bucket;
  } catch (e) {
    // If bucket checks fail, still try upload (Supabase will error if missing).
    return bucket;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('ao_brand_assets')
        .select('*')
        .eq('kind', 'logo')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ ok: true, assets: data || [] });
    } catch (e) {
      const msg = String(e?.message || e || '');
      if (msg.includes('ao_brand_assets')) {
        return res.status(500).json({ ok: false, error: 'Brand assets are not set up yet. Run database/ao_brand_assets.sql in Supabase.' });
      }
      return res.status(500).json({ ok: false, error: msg || 'Server error' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { fields, file } = await parseMultipartFormData(req);

    const label = safeText(fields?.label, 80);
    if (!label) return res.status(400).json({ ok: false, error: 'Label is required' });

    const variantRaw = safeText(fields?.variant, 20).toLowerCase() || 'other';
    const allowedVariants = ['mark', 'wordmark', 'lockup_light', 'lockup_dark', 'other'];
    const variant = allowedVariants.includes(variantRaw) ? variantRaw : 'other';

    if (!file?.buffer?.length) return res.status(400).json({ ok: false, error: 'File is required' });

    const mimetype = String(file.mimetype || '').toLowerCase().trim();
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({ ok: false, error: 'File must be SVG, PNG, or JPEG' });
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.buffer.length > maxSize) {
      return res.status(400).json({ ok: false, error: 'File size must be less than 2MB' });
    }

    const isDefaultLight = parseBool(fields?.defaultLight);
    const isDefaultDark = parseBool(fields?.defaultDark);

    const ext =
      mimetype === 'image/svg+xml' ? 'svg' : mimetype === 'image/jpeg' || mimetype === 'image/jpg' ? 'jpg' : 'png';
    const bucket = await ensureBucket();
    const storagePath = `logos/${crypto.randomUUID()}.${ext}`;

    const up = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, file.buffer, { contentType: mimetype, upsert: true });
    if (up.error) {
      return res.status(500).json({ ok: false, error: `Upload failed: ${up.error.message}` });
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl || null;

    // If setting defaults, clear previous defaults first.
    if (isDefaultLight) {
      await supabaseAdmin.from('ao_brand_assets').update({ is_default_light: false }).eq('kind', 'logo').eq('is_default_light', true);
    }
    if (isDefaultDark) {
      await supabaseAdmin.from('ao_brand_assets').update({ is_default_dark: false }).eq('kind', 'logo').eq('is_default_dark', true);
    }

    const ins = await supabaseAdmin
      .from('ao_brand_assets')
      .insert({
        kind: 'logo',
        label,
        variant,
        mime_type: mimetype,
        file_name: safeText(file.originalname, 180) || null,
        storage_bucket: bucket,
        storage_path: storagePath,
        public_url: publicUrl,
        is_default_light: isDefaultLight,
        is_default_dark: isDefaultDark,
        created_by_email: auth.email || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (ins.error) {
      const msg = String(ins.error.message || '');
      if (msg.includes('ao_brand_assets')) {
        return res.status(500).json({ ok: false, error: 'Brand assets are not set up yet. Run database/ao_brand_assets.sql in Supabase.' });
      }
      return res.status(500).json({ ok: false, error: ins.error.message });
    }

    return res.status(200).json({ ok: true, asset: ins.data });
  } catch (e) {
    const msg = String(e?.message || e || '');
    return res.status(500).json({ ok: false, error: msg || 'Server error' });
  }
}

