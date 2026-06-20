import { supabaseAdmin } from '../supabase-admin.js';
import { generateEpisodeClipCaption } from './generateEpisodeClipCaption.js';

function rowToClipDraft(row) {
  if (!row) return null;
  return {
    clip_draft_id: row.id,
    status: row.status,
    parent_episode_slug: row.parent_episode_slug,
    parent_episode_draft_id: row.parent_episode_draft_id,
    clip_video_url: row.clip_video_url,
    storage_path: row.storage_path,
    caption: row.caption,
    hashtags: row.hashtags || [],
    cta: row.cta,
    clip_hint: row.clip_hint,
    meta: row.meta || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function insertEpisodeClipDraft(email, payload) {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_clip_drafts')
    .insert({
      created_by_email: String(email || '').trim().toLowerCase(),
      status: 'draft',
      parent_episode_slug: payload.parent_episode_slug || null,
      parent_episode_draft_id: payload.parent_episode_draft_id || null,
      clip_video_url: payload.clip_video_url || null,
      storage_path: payload.storage_path || null,
      clip_hint: payload.clip_hint || '',
      caption: payload.caption || '',
      hashtags: payload.hashtags || [],
      cta: payload.cta || null,
      meta: payload.meta || {},
    })
    .select('*')
    .single();

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'episode_clip_drafts_table_missing' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, clip_draft: rowToClipDraft(data) };
}

export async function getEpisodeClipDraftForUser(clipDraftId, email) {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_clip_drafts')
    .select('*')
    .eq('id', clipDraftId)
    .eq('created_by_email', String(email || '').trim().toLowerCase())
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'clip_draft_not_found' };
  return { ok: true, clip_draft: rowToClipDraft(data) };
}

export async function updateEpisodeClipDraftForUser(clipDraftId, email, patch) {
  const allowed = [
    'status',
    'parent_episode_slug',
    'parent_episode_draft_id',
    'clip_video_url',
    'storage_path',
    'clip_hint',
    'caption',
    'hashtags',
    'cta',
    'meta',
  ];
  const update = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }

  const { data, error } = await supabaseAdmin
    .from('ao_episode_clip_drafts')
    .update(update)
    .eq('id', clipDraftId)
    .eq('created_by_email', String(email || '').trim().toLowerCase())
    .select('*')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'clip_draft_not_found' };
  return { ok: true, clip_draft: rowToClipDraft(data) };
}

/**
 * Generate caption + hashtags for a clip draft (approval gate: status stays draft until Bart approves).
 */
export async function proposeEpisodeClipCaption({
  clipDraftId,
  email,
  episode_title = '',
  episode_url = '',
  clip_hint = '',
} = {}) {
  const loaded = await getEpisodeClipDraftForUser(clipDraftId, email);
  if (!loaded.ok) return loaded;

  const hint = clip_hint || loaded.clip_draft.clip_hint || '';
  const generated = await generateEpisodeClipCaption({
    episode_title,
    episode_url,
    clip_hint: hint,
  });

  if (!generated.ok) {
    return { ok: false, error: 'caption_generation_failed' };
  }

  return updateEpisodeClipDraftForUser(clipDraftId, email, {
    caption: generated.caption,
    hashtags: generated.hashtags,
    cta: generated.cta,
    clip_hint: hint,
    meta: {
      ...(loaded.clip_draft.meta || {}),
      caption_proposed_at: new Date().toISOString(),
    },
  });
}
