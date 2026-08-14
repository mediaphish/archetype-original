/**
 * Sanctioned access layer for ao_content_draft_versions.
 * Append-only history: one row per save_draft overwrite (pre-save content).
 */

import { supabaseAdmin } from '../supabase-admin.js';

export function contentDraftVersions() {
  return supabaseAdmin.from('ao_content_draft_versions');
}

/**
 * Snapshot the draft's current content/title before an overwrite.
 */
export async function insertVersion({
  draftId,
  content,
  title = null,
  email,
}) {
  const draft_id = String(draftId || '').trim();
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const contentNorm = content == null ? '' : String(content);
  if (!draft_id) return { ok: false, error: 'draft_id is required' };
  if (!emailNorm) return { ok: false, error: 'email is required' };

  const { data, error } = await contentDraftVersions()
    .insert({
      draft_id,
      content: contentNorm,
      title: title != null ? String(title) : null,
      created_by_email: emailNorm,
    })
    .select('id, draft_id, created_at, title')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, version: data };
}

/**
 * List version metadata for a draft (newest first). Omits full content.
 */
export async function listVersions({ draftId, email, limit = 50 }) {
  const draft_id = String(draftId || '').trim();
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!draft_id) return { ok: false, error: 'draft_id is required', versions: [] };
  if (!emailNorm) return { ok: false, error: 'email is required', versions: [] };

  const { data, error } = await contentDraftVersions()
    .select('id, draft_id, title, created_at, created_by_email')
    .eq('draft_id', draft_id)
    .eq('created_by_email', emailNorm)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));

  if (error) return { ok: false, error: error.message, versions: [] };
  return { ok: true, versions: data || [] };
}

/**
 * Fetch one version's full content, scoped by owner email.
 */
export async function getVersion({ versionId, email }) {
  const id = String(versionId || '').trim();
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!id) return { ok: false, error: 'version_id is required', version: null };
  if (!emailNorm) return { ok: false, error: 'email is required', version: null };

  const { data, error } = await contentDraftVersions()
    .select('id, draft_id, content, title, created_at, created_by_email')
    .eq('id', id)
    .eq('created_by_email', emailNorm)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, version: null };
  if (!data) return { ok: false, error: 'Version not found', version: null };
  return { ok: true, version: data };
}

/**
 * Count versions for a draft (tests / diagnostics).
 */
export async function countVersions({ draftId, email }) {
  const draft_id = String(draftId || '').trim();
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  if (!draft_id || !emailNorm) return { ok: false, count: 0 };

  const { count, error } = await contentDraftVersions()
    .select('id', { count: 'exact', head: true })
    .eq('draft_id', draft_id)
    .eq('created_by_email', emailNorm);

  if (error) return { ok: false, error: error.message, count: 0 };
  return { ok: true, count: count ?? 0 };
}
