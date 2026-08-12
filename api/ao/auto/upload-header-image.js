import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { canonicalizeSlug } from '../../../lib/ao/autoV2.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { contentDrafts } from '../../../lib/db/contentDrafts.js';
import { recordManualHeaderUploadFact } from '../../../lib/ao/manualHeaderUploadFact.js';

const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'ao-design-images';

/**
 * POST /api/ao/auto/upload-header-image
 *
 * Lets Bart upload a locally-made image (e.g. generated in ChatGPT) directly
 * as the header image for a specific draft, skipping Auto's own image
 * generation entirely. Uploads to the same storage bucket Auto's own
 * generated images use, then writes the resulting URL straight onto the
 * matching ao_content_drafts row's image_url field.
 *
 * Also records a durable system fact on the active Auto thread so the model
 * learns the upload happened on the next chat turn (without Bart pasting a URL).
 *
 * Body: {
 *   slug: string,          -- which draft this image belongs to
 *   image_base64: string,  -- raw base64 image data (no data: prefix)
 *   media_type: string,    -- e.g. "image/png", "image/jpeg"
 *   thread_id?: string,    -- optional; defaults to the owner's active thread
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  try {
    const { slug, image_base64, media_type, thread_id } = req.body || {};

    const safeSlug = canonicalizeSlug(slug);
    if (!safeSlug) {
      res.status(400).json({ ok: false, error: 'slug is required' });
      return;
    }

    if (!image_base64 || typeof image_base64 !== 'string') {
      res.status(400).json({ ok: false, error: 'image_base64 is required' });
      return;
    }

    const safeMediaType = String(media_type || 'image/png').trim();
    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[safeMediaType] || 'png';

    let buffer;
    try {
      buffer = Buffer.from(image_base64, 'base64');
    } catch (decodeErr) {
      res.status(400).json({ ok: false, error: 'Could not decode image_base64' });
      return;
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ ok: false, error: 'Decoded image is empty' });
      return;
    }

    const timestamp = Date.now();
    const filename = `manual-upload-${safeSlug}-${timestamp}.${ext}`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: safeMediaType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-header-image] Storage upload failed:', uploadError.message);
      res.status(500).json({ ok: false, error: `Storage upload failed: ${uploadError.message}` });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData?.publicUrl;

    if (!imageUrl) {
      res.status(500).json({ ok: false, error: 'Image uploaded but could not retrieve public URL' });
      return;
    }

    const { data: updatedRow, error: updateError } = await contentDrafts()
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('created_by_email', auth.email.toLowerCase().trim())
      .eq('slug', safeSlug)
      .in('kind', ['journal', 'devotional'])
      .select('slug, title, status, image_url')
      .maybeSingle();

    if (updateError) {
      console.error('[upload-header-image] Draft update failed:', updateError.message);
      res.status(500).json({
        ok: false,
        error: `Image uploaded to storage but could not save it to the draft: ${updateError.message}`,
        image_url: imageUrl,
      });
      return;
    }

    let resultSlug = updatedRow?.slug || safeSlug;
    let resultTitle = updatedRow?.title || null;
    let resultStatus = updatedRow?.status || null;
    let createdNewDraft = false;

    if (!updatedRow) {
      const derivedTitle = safeSlug
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const { data: createdRow, error: insertError } = await contentDrafts()
        .insert({
          created_by_email: auth.email.toLowerCase().trim(),
          kind: 'journal',
          series_slug: safeSlug,
          part_number: 1,
          slug: safeSlug,
          title: derivedTitle,
          content: '',
          status: 'draft',
          image_url: imageUrl,
        })
        .select('slug, title, status, image_url')
        .single();

      if (insertError) {
        console.error('[upload-header-image] Placeholder draft creation failed:', insertError.message);
        res.status(500).json({
          ok: false,
          error: `Image uploaded to storage, but no draft existed yet for slug "${safeSlug}" and creating one failed: ${insertError.message}`,
          image_url: imageUrl,
        });
        return;
      }

      resultSlug = createdRow.slug;
      resultTitle = createdRow.title;
      resultStatus = createdRow.status;
      createdNewDraft = true;
    }

    let threadFactRecorded = false;
    let threadFactError = null;
    const factResult = await recordManualHeaderUploadFact({
      email: auth.email,
      threadId: thread_id || null,
      slug: resultSlug,
      imageUrl,
      title: resultTitle,
    });
    if (factResult.ok) {
      threadFactRecorded = true;
    } else {
      threadFactError = factResult.error;
      console.error('[upload-header-image] Thread fact not recorded:', factResult.error);
    }

    res.status(200).json({
      ok: true,
      image_url: imageUrl,
      slug: resultSlug,
      title: resultTitle,
      status: resultStatus,
      created_new_draft: createdNewDraft || undefined,
      thread_fact_recorded: threadFactRecorded,
      thread_fact_error: threadFactError,
      thread_id: factResult.thread_id || null,
    });
  } catch (err) {
    console.error('[upload-header-image] Unexpected error:', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
