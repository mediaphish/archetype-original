/**
 * Durable thread facts for the most recent Direct Image (attach_for_reference)
 * generation — so correction turns can edit the last result without re-attaching.
 * Mirrors chatAttachedImageFact.js (system message + meta.kind on ao_auto_messages).
 */

export const DIRECT_IMAGE_RESULT_FACT_KIND = 'direct_image_result';

export async function recordDirectImageResultFact({
  email,
  threadId,
  imageUrl,
  promptDescription,
}) {
  const emailNorm = String(email || '').toLowerCase().trim();
  const url = String(imageUrl || '').trim();
  if (!emailNorm || !url) return { ok: false, error: 'email and imageUrl are required' };
  try {
    const { addAutoMessage, ensureAutoThread } = await import('./autoHub.js');
    const thread = await ensureAutoThread(emailNorm, threadId || '');
    const timestamp = new Date().toISOString();
    const message = await addAutoMessage({
      threadId: thread.id,
      role: 'system',
      mode: 'plan',
      content: `[SYSTEM] Direct Image generated at ${timestamp}. Durable URL: ${url}.`,
      meta: {
        kind: DIRECT_IMAGE_RESULT_FACT_KIND,
        image_url: url,
        prompt_description: promptDescription || null,
        recorded_at: timestamp,
      },
    });
    return { ok: true, message, thread_id: thread.id, image_url: url };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Most recent Direct Image result for this thread, or null. No "consumed" concept. */
export async function loadLastDirectImageUrl(threadId) {
  const tid = String(threadId || '').trim();
  if (!tid) return null;
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { data, error } = await supabaseAdmin
    .from('ao_auto_messages')
    .select('meta, created_at')
    .eq('thread_id', tid)
    .eq('role', 'system')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !Array.isArray(data)) return null;
  for (const row of data) {
    const meta = row?.meta && typeof row.meta === 'object' ? row.meta : {};
    if (meta.kind === DIRECT_IMAGE_RESULT_FACT_KIND && meta.image_url) {
      return String(meta.image_url);
    }
  }
  return null;
}
