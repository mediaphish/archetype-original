import crypto from 'crypto';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { ensureAutoThread } from '../../../lib/ao/autoHub.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

async function ensureBucket() {
  const bucket = 'ao-auto-attachments';
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === bucket);
    if (exists) return bucket;
    const created = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 8 * 1024 * 1024,
    });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) {
      throw created.error;
    }
    return bucket;
  } catch {
    return bucket;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const thread = await ensureAutoThread(auth.email, req.body?.thread_id || '');
    const rawItems = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    if (!rawItems.length) return res.status(400).json({ ok: false, error: 'attachments required' });

    const bucket = await ensureBucket();
    const created = [];

    for (const item of rawItems.slice(0, 8)) {
      const fileName = safeText(item?.file_name, 200);
      const mimeType = safeText(item?.mime_type, 80).toLowerCase();
      const label = safeText(item?.label, 120);
      const base64 = String(item?.content_base64 || '');
      const extractedText = safeText(item?.extracted_text, 30000);
      const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType);
      const isText = mimeType === 'text/plain' || mimeType === 'text/markdown' || fileName.endsWith('.txt') || fileName.endsWith('.md');
      if (!fileName || (!isImage && !isText)) continue;

      let publicUrl = null;
      let storagePath = null;
      if (isImage && base64) {
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        storagePath = `threads/${thread.id}/${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(base64, 'base64');
        const upload = await supabaseAdmin.storage.from(bucket).upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });
        if (!upload.error) {
          const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
          publicUrl = pub?.publicUrl || null;
        }
      }

      const inserted = await supabaseAdmin
        .from('ao_auto_attachments')
        .insert({
          thread_id: thread.id,
          label: label || null,
          kind: isImage ? 'image' : 'text',
          file_name: fileName,
          mime_type: mimeType || (isText ? 'text/plain' : 'image/jpeg'),
          extracted_text: isText ? extractedText : null,
          storage_bucket: publicUrl ? bucket : null,
          storage_path: storagePath,
          public_url: publicUrl,
          sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : 0,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (!inserted.error && inserted.data) created.push(inserted.data);
    }

    return res.status(200).json({ ok: true, thread_id: thread.id, attachments: created });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
