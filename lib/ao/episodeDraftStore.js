import { supabaseAdmin } from '../supabase-admin.js';

function rowToDraft(row) {
  if (!row) return null;
  return {
    draft_id: row.id,
    status: row.status,
    episode_type: row.episode_type,
    recorded_date: row.recorded_date,
    transcript: row.transcript,
    title: row.title,
    summary: row.summary,
    body_md: row.body_md,
    show_notes: row.show_notes || [],
    key_takeaways: row.key_takeaways || [],
    categories: row.categories || [],
    tags: row.tags || [],
    related: row.related || [],
    guest: row.guest,
    guest_id: row.guest_id || null,
    slug: row.slug,
    youtube_id: row.youtube_id,
    spotify_embed_url: row.spotify_embed_url,
    duration: row.duration,
    video_source_url: row.video_source_url || '',
    target_path: row.target_path,
    meta: row.meta || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function insertEpisodeDraft(email, payload) {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_drafts')
    .insert({
      created_by_email: String(email || '').trim().toLowerCase(),
      status: 'draft',
      episode_type: payload.episode_type || 'solo',
      recorded_date: payload.recorded_date || null,
      transcript: payload.transcript || '',
      title: payload.title || '',
      summary: payload.summary || '',
      body_md: payload.body_md || '',
      show_notes: payload.show_notes || [],
      key_takeaways: payload.key_takeaways || [],
      categories: payload.categories || [],
      tags: payload.tags || [],
      related: payload.related || [],
      guest: payload.guest || null,
      meta: payload.meta || {},
    })
    .select('*')
    .single();

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'episode_drafts_table_missing' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, draft: rowToDraft(data) };
}

export async function getEpisodeDraftForUser(draftId, email) {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('created_by_email', String(email || '').trim().toLowerCase())
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'draft_not_found' };
  return { ok: true, draft: rowToDraft(data) };
}

export async function updateEpisodeDraftForUser(draftId, email, patch) {
  const allowed = [
    'title',
    'summary',
    'body_md',
    'show_notes',
    'key_takeaways',
    'categories',
    'tags',
    'related',
    'guest',
    'guest_id',
    'slug',
    'youtube_id',
    'spotify_embed_url',
    'duration',
    'video_source_url',
    'status',
    'target_path',
    'meta',
  ];
  const update = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }

  const { data, error } = await supabaseAdmin
    .from('ao_episode_drafts')
    .update(update)
    .eq('id', draftId)
    .eq('created_by_email', String(email || '').trim().toLowerCase())
    .select('*')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'draft_not_found' };
  return { ok: true, draft: rowToDraft(data) };
}

export async function listAllEpisodeDrafts() {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_drafts')
    .select('id, title, episode_type, status, guest, guest_id, recorded_date, updated_at, slug, meta')
    .order('updated_at', { ascending: false });

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'episode_drafts_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, drafts: (data || []).map(rowToDraft) };
}
