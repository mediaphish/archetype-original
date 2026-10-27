/**
 * Chat-attached reference images → durable thread facts Auto can use later.
 *
 * Paperclip uploads are visible to vision for one turn as base64. Generation
 * needs a durable https URL for reference_image_urls. Mirror the
 * manualHeaderUploadFact pattern: store a system message on the thread, fold
 * unconsumed facts into later turns, mark consumed after injection.
 */

export const CHAT_ATTACHED_IMAGE_FACT_KIND = 'chat_attached_image';

export function formatChatAttachedImageFact({
  imageUrl,
  mediaType = null,
  filename = null,
  timestamp = null,
  index = 1,
}) {
  const when = timestamp || new Date().toISOString();
  const typeBit = mediaType ? ` (${mediaType})` : '';
  const nameBit = filename ? ` file "${filename}"` : '';
  return (
    `[SYSTEM] User attached a reference image${nameBit}${typeBit} in chat at ${when} ` +
    `(attachment #${index}). Durable URL for generate_image reference_image_urls: ${imageUrl}. ` +
    `This image was uploaded to storage so Auto can pass it as a real visual reference on this or later turns — ` +
    `not text-only prompting.`
  );
}

/**
 * Upload one chat attachment buffer to ao-auto-attachments and return public URL.
 */
export async function uploadChatAttachedImageBuffer({
  buffer,
  mediaType = 'image/png',
  filenameHint = 'chat-ref',
}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 32) {
    return { ok: false, error: 'empty image buffer' };
  }
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const extMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const mime = String(mediaType || 'image/png').toLowerCase();
  const ext = extMap[mime] || 'png';
  const safeHint = String(filenameHint || 'chat-ref')
    .replace(/[^a-z0-9-_]/gi, '-')
    .toLowerCase()
    .slice(0, 48);
  const storagePath = `ao-design-images/chat-ref-${safeHint}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('ao-auto-attachments')
    .upload(storagePath, buffer, { contentType: mime, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('ao-auto-attachments')
    .getPublicUrl(storagePath);
  const imageUrl = urlData?.publicUrl;
  if (!imageUrl) return { ok: false, error: 'no public URL after upload' };
  return { ok: true, image_url: imageUrl, path: storagePath };
}

/**
 * Persist a system fact for a chat-attached reference image.
 */
export async function recordChatAttachedImageFact({
  email,
  threadId = null,
  imageUrl,
  mediaType = null,
  filename = null,
  index = 1,
}) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const url = String(imageUrl || '').trim();
  if (!emailNorm) return { ok: false, error: 'email is required' };
  if (!url) return { ok: false, error: 'imageUrl is required' };

  try {
    const { addAutoMessage, ensureAutoThread } = await import('./autoHub.js');
    const thread = await ensureAutoThread(emailNorm, threadId || '');
    const timestamp = new Date().toISOString();
    const fact = formatChatAttachedImageFact({
      imageUrl: url,
      mediaType,
      filename,
      timestamp,
      index,
    });

    const message = await addAutoMessage({
      threadId: thread.id,
      role: 'system',
      mode: 'plan',
      content: fact,
      meta: {
        kind: CHAT_ATTACHED_IMAGE_FACT_KIND,
        image_url: url,
        media_type: mediaType || null,
        filename: filename || null,
        consumed: false,
        recorded_at: timestamp,
      },
    });

    return { ok: true, message, fact, thread_id: thread.id, image_url: url };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Upload every image attachment, record durable facts, return URLs + fact text for this turn.
 * Never throws.
 */
export async function persistChatAttachedImages({
  email,
  threadId = null,
  attachments = [],
}) {
  const images = (Array.isArray(attachments) ? attachments : []).filter(
    (a) => a?.type === 'image' && a?.data && a?.mediaType
  );
  if (!images.length) {
    return { ok: true, urls: [], facts: [], factTexts: [], messageIds: [] };
  }

  const urls = [];
  const facts = [];
  const factTexts = [];
  const messageIds = [];

  for (let i = 0; i < images.length; i += 1) {
    const att = images[i];
    let buffer;
    try {
      buffer = Buffer.from(att.data, 'base64');
    } catch {
      continue;
    }
    const uploaded = await uploadChatAttachedImageBuffer({
      buffer,
      mediaType: att.mediaType,
      filenameHint: att.name || att.filename || `att-${i + 1}`,
    });
    if (!uploaded.ok) {
      console.error('[chatAttachedImageFact] upload failed:', uploaded.error);
      continue;
    }
    urls.push(uploaded.image_url);
    const recorded = await recordChatAttachedImageFact({
      email,
      threadId,
      imageUrl: uploaded.image_url,
      mediaType: att.mediaType,
      filename: att.name || att.filename || null,
      index: i + 1,
    });
    if (recorded.ok) {
      facts.push(recorded);
      factTexts.push(recorded.fact);
      if (recorded.message?.id) messageIds.push(recorded.message.id);
    } else {
      // Still surface the URL this turn even if durable fact write failed.
      factTexts.push(
        formatChatAttachedImageFact({
          imageUrl: uploaded.image_url,
          mediaType: att.mediaType,
          filename: att.name || att.filename || null,
          index: i + 1,
        })
      );
      console.error('[chatAttachedImageFact] record failed:', recorded.error);
    }
  }

  return { ok: true, urls, facts, factTexts, messageIds };
}

export async function loadUnconsumedChatAttachedImageFacts(threadId, { limit = 40 } = {}) {
  const tid = String(threadId || '').trim();
  if (!tid) return { facts: [], messageIds: [], urls: [] };

  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { data, error } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('id, content, meta, created_at')
    .eq('thread_id', tid)
    .eq('role', 'system')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 10, 1), 40));

  if (error || !Array.isArray(data)) {
    if (error) console.error('[chatAttachedImageFact] load failed:', error.message);
    return { facts: [], messageIds: [], urls: [] };
  }

  const facts = [];
  const messageIds = [];
  const urls = [];
  for (const row of data) {
    const meta = row?.meta && typeof row.meta === 'object' ? row.meta : {};
    if (meta.kind !== CHAT_ATTACHED_IMAGE_FACT_KIND) continue;
    if (meta.consumed === true) continue;
    const text = String(row.content || '').trim();
    if (!text) continue;
    facts.push(text);
    messageIds.push(row.id);
    if (meta.image_url) urls.push(String(meta.image_url));
  }

  facts.reverse();
  messageIds.reverse();
  urls.reverse();
  return { facts, messageIds, urls };
}

/**
 * Every reference image Bart attached in this conversation, oldest first,
 * whether or not a turn has already used it.
 *
 * 2026-10-27. Bart attached 21 RemAIning Human images; one reply later they
 * were marked used, dropped out of what the team sees, and Cam said "I still
 * can't get to your RemAIning Human images." Bart: "Already Auto has lost
 * them. That's not good." The images stay usable for the whole conversation.
 */
export async function loadThreadReferenceImages(threadId, { limit = 40 } = {}) {
  const tid = String(threadId || '').trim();
  if (!tid) return [];
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { data, error } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('meta, created_at')
    .eq('thread_id', tid)
    .eq('role', 'system')
    .eq('meta->>kind', CHAT_ATTACHED_IMAGE_FACT_KIND)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 40, 1), 80));
  if (error || !Array.isArray(data)) {
    if (error) console.error('[chatAttachedImageFact] reference list failed:', error.message);
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const row of data.slice().reverse()) {
    const url = String(row?.meta?.image_url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, attached_at: row.created_at });
  }
  return out;
}

/** Pure: the standing note that lists the conversation's reference images. */
export function formatThreadReferenceImagesNote(images) {
  const list = (Array.isArray(images) ? images : []).filter((i) => i?.url);
  if (!list.length) return '';
  return [
    `[SYSTEM] Reference images Bart attached earlier in this conversation (${list.length}). They are saved and stay usable for the whole conversation: pass the ones that fit best (up to 16 at once) as generate_image reference_image_urls. Never say they are lost or ask him to attach them again.`,
    ...list.map((i, n) => `${n + 1}. ${i.url}`),
  ].join('\n');
}

/**
 * The most recent real chat-attached reference photo in this thread — a true
 * original upload, never a prior AI-generated output. Used to anchor likeness
 * verification so a correction chain cannot drift by only being checked against
 * its own immediately-prior result. Ignores the "consumed" flag.
 *
 * Newest upload wins (not oldest): if Bart attaches a new photo later in the
 * same thread, that is the identity to check against. Chat-attached facts are
 * only real uploads, so this never returns a generated Direct Image URL.
 */
export async function loadOriginalChatAttachedImageUrl(threadId) {
  const tid = String(threadId || '').trim();
  if (!tid) return null;
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { data, error } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('meta, created_at')
    .eq('thread_id', tid)
    .eq('role', 'system')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error || !Array.isArray(data)) return null;
  for (const row of data) {
    const meta = row?.meta && typeof row.meta === 'object' ? row.meta : {};
    if (meta.kind === CHAT_ATTACHED_IMAGE_FACT_KIND && meta.image_url) {
      return String(meta.image_url);
    }
  }
  return null;
}

export async function markChatAttachedImageFactsConsumed(messageIds) {
  const ids = (Array.isArray(messageIds) ? messageIds : []).filter(Boolean);
  if (!ids.length) return { ok: true, updated: 0 };

  const { supabaseAdmin } = await import('../supabase-admin.js');
  let updated = 0;
  for (const id of ids) {
    const { data: existing } = await supabaseAdmin
      .from('ao_auto_messages')
      .select('id, meta')
      .eq('id', id)
      .maybeSingle();
    if (!existing) continue;
    const meta = existing.meta && typeof existing.meta === 'object' ? { ...existing.meta } : {};
    meta.consumed = true;
    meta.consumed_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('ao_auto_messages').update({ meta }).eq('id', id);
    if (!error) updated += 1;
  }
  return { ok: true, updated };
}
