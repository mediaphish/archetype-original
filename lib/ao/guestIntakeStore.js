import { supabaseAdmin } from '../supabase-admin.js';

export const GUEST_PLATFORMS = [
  'instagram',
  'linkedin',
  'twitter',
  'youtube',
  'tiktok',
  'facebook',
  'other',
];

export function normalizeSocialLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((row) => ({
      platform: String(row?.platform || '').trim().toLowerCase(),
      url: String(row?.url || '').trim(),
    }))
    .filter((row) => row.platform && row.url && GUEST_PLATFORMS.includes(row.platform));
}

export function guestInitialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function guestRecordToEpisodeGuest(row) {
  if (!row) return null;
  const socialLinks = normalizeSocialLinks(row.social_links);
  const company = row.company || '';
  return {
    guest_id: row.id,
    name: row.name,
    company,
    bio: row.bio_md || '',
    image: row.image_url || '',
    website: row.website || '',
    social_links: socialLinks,
    initials: guestInitialsFromName(row.name),
  };
}

export function formatGuestTitleLine(guest) {
  if (!guest) return '';
  const title = String(guest.title || '').trim();
  const company = String(guest.company || '').trim();
  if (title && company) return `${title}, ${company}`;
  return title || company || '';
}

export function normalizeSchedulePreferredDays(days) {
  if (!Array.isArray(days)) return [];
  const allowed = new Set([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]);
  return days
    .map((d) => String(d || '').trim())
    .filter((d) => allowed.has(d));
}

export async function insertGuestIntake(payload) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .insert({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      text_ok: Boolean(payload.text_ok),
      website: payload.website || null,
      company: payload.company || null,
      image_url: payload.image_url || null,
      social_links: normalizeSocialLinks(payload.social_links),
      bio_md: payload.bio_md || '',
      question_1: payload.question_1 || '',
      question_2: payload.question_2 || '',
      question_3: payload.question_3 || '',
      question_4: payload.question_4 || '',
      question_5: payload.question_5 || '',
      schedule_preferred_days: normalizeSchedulePreferredDays(payload.schedule_preferred_days),
      schedule_preferred_time: payload.schedule_preferred_time || null,
      schedule_avoid_dates: payload.schedule_avoid_dates || null,
      schedule_timezone: payload.schedule_timezone || null,
      release_agreed: true,
      release_agreed_at: now,
      submitted_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'guest_intake_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, guest: data };
}

export async function getGuestById(id) {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'guest_not_found' };
  return { ok: true, guest: data };
}

export async function searchGuests({ query, limit = 12 }) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return { ok: true, guests: [] };

  const cap = Math.min(limit, 25);
  const pattern = `%${q.replace(/[%_\\]/g, '')}%`;
  const fields = 'id, name, email, company, image_url, submitted_at, research_brief, schedule_timezone, episode_thread_id';

  const [byName, byEmail] = await Promise.all([
    supabaseAdmin
      .from('ao_podcast_guests')
      .select(fields)
      .ilike('name', pattern)
      .order('submitted_at', { ascending: false })
      .limit(cap),
    supabaseAdmin
      .from('ao_podcast_guests')
      .select(fields)
      .ilike('email', pattern)
      .order('submitted_at', { ascending: false })
      .limit(cap),
  ]);

  const error = byName.error || byEmail.error;
  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'guest_intake_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  const merged = new Map();
  for (const row of [...(byName.data || []), ...(byEmail.data || [])]) {
    merged.set(row.id, row);
  }
  const guests = Array.from(merged.values())
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, cap);

  return { ok: true, guests };
}

export async function listGuestsPaginated({ page = 1, pageSize = 20 }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeSize = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 50);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('id, name, email, company, image_url, submitted_at, research_brief, episode_thread_id', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, to);

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'guest_intake_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    guests: data || [],
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

export async function getGuestEpisodeStatusMap() {
  const { data, error } = await supabaseAdmin
    .from('ao_episode_drafts')
    .select('guest_id, status')
    .not('guest_id', 'is', null);

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return {};
    }
    return {};
  }

  const map = {};
  for (const row of data || []) {
    const id = row.guest_id;
    const status = String(row.status || '').toLowerCase();
    if (!id) continue;
    if (!map[id]) {
      map[id] = status;
      continue;
    }
    if (status === 'published') map[id] = 'published';
    else if (map[id] !== 'published') map[id] = status;
  }
  return map;
}

export function guestEpisodeStatusLabel(statusMap, guestId) {
  const st = statusMap[guestId];
  if (!st) return 'No episode';
  if (st === 'published') return 'Episode published';
  return 'Episode assigned';
}

export function enrichGuestDirectoryRow(guest, statusMap) {
  return {
    ...guest,
    episode_status: guestEpisodeStatusLabel(statusMap, guest.id),
    research_status: guest.research_brief ? 'Research ready' : 'No research',
    initials: guestInitialsFromName(guest.name),
  };
}

export function guestToPublicView(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    text_ok: Boolean(row.text_ok),
    website: row.website,
    company: row.company,
    image_url: row.image_url,
    social_links: normalizeSocialLinks(row.social_links),
    bio_md: row.bio_md,
    question_1: row.question_1,
    question_2: row.question_2,
    question_3: row.question_3,
    question_4: row.question_4,
    question_5: row.question_5,
    schedule_preferred_days: normalizeSchedulePreferredDays(row.schedule_preferred_days),
    schedule_preferred_time: row.schedule_preferred_time,
    schedule_avoid_dates: row.schedule_avoid_dates,
    schedule_timezone: row.schedule_timezone,
    submitted_at: row.submitted_at,
    research_brief: row.research_brief,
    research_generated_at: row.research_generated_at,
    suggested_questions: row.suggested_questions,
    questions_generated_at: row.questions_generated_at,
    producer_brief: row.producer_brief,
    producer_brief_generated_at: row.producer_brief_generated_at,
    post_recording_surprise: row.post_recording_surprise,
    post_recording_follow_up: row.post_recording_follow_up,
    post_recording_landed: row.post_recording_landed,
    post_recording_captured_at: row.post_recording_captured_at,
  };
}

/**
 * Guest-facing view — this is what gets sent to the guest's own browser.
 * Includes their intake data and the suggested interview questions (text only),
 * so they can see what might come up and prepare.
 *
 * Explicitly excludes:
 * - research_brief — Bart's private prep notes, often contains the guest's
 *   own confidential reflections synthesized alongside interview strategy
 * - the "why" field on each suggested question — Bart's private notes on
 *   interview strategy and what to press on
 * - producer_brief — recording-day production notes, not guest-facing
 * - post_recording_* fields — Bart's private debrief notes taken after
 *   the guest has already left the conversation
 *
 * Any new field added to the guest record must be deliberately added here
 * to become guest-visible. The default is exclusion, not inclusion.
 */
export function guestToGuestSafeView(row) {
  if (!row) return null;

  let questionsForGuest = null;
  if (row.suggested_questions && typeof row.suggested_questions === 'object') {
    const stripWhy = (list) =>
      Array.isArray(list)
        ? list.map((item) => ({ question: item?.question || '' })).filter((item) => item.question)
        : [];

    questionsForGuest = {
      person_specific: stripWhy(row.suggested_questions.person_specific),
      ao_theology: stripWhy(row.suggested_questions.ao_theology),
    };

    // If both categories ended up empty, don't send an empty shell
    if (questionsForGuest.person_specific.length === 0 && questionsForGuest.ao_theology.length === 0) {
      questionsForGuest = null;
    }
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    text_ok: Boolean(row.text_ok),
    website: row.website,
    company: row.company,
    image_url: row.image_url,
    social_links: normalizeSocialLinks(row.social_links),
    bio_md: row.bio_md,
    question_1: row.question_1,
    question_2: row.question_2,
    question_3: row.question_3,
    question_4: row.question_4,
    question_5: row.question_5,
    schedule_preferred_days: normalizeSchedulePreferredDays(row.schedule_preferred_days),
    schedule_preferred_time: row.schedule_preferred_time,
    schedule_avoid_dates: row.schedule_avoid_dates,
    schedule_timezone: row.schedule_timezone,
    submitted_at: row.submitted_at,
    suggested_questions: questionsForGuest,
    // Deliberately omitted: research_brief, producer_brief, post_recording_*
  };
}

export async function updateGuestResearch(id, { research_brief, clear = false }) {
  const now = new Date().toISOString();
  const patch = clear
    ? { research_brief: null, research_generated_at: null, updated_at: now }
    : { research_brief, research_generated_at: now, updated_at: now };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, guest: data };
}

export async function updateGuestQuestions(id, { suggested_questions, clear = false }) {
  const now = new Date().toISOString();
  const patch = clear
    ? { suggested_questions: null, questions_generated_at: null, updated_at: now }
    : { suggested_questions, questions_generated_at: now, updated_at: now };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, guest: data };
}

export async function updateGuestProducerBrief(id, { producer_brief, clear = false }) {
  const now = new Date().toISOString();
  const patch = clear
    ? { producer_brief: null, producer_brief_generated_at: null, updated_at: now }
    : { producer_brief, producer_brief_generated_at: now, updated_at: now };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, guest: data };
}

export async function updateGuestPostRecording(id, fields) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update({
      post_recording_surprise: String(fields.post_recording_surprise || '').trim() || null,
      post_recording_follow_up: String(fields.post_recording_follow_up || '').trim() || null,
      post_recording_landed: String(fields.post_recording_landed || '').trim() || null,
      post_recording_captured_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, guest: data };
}

/**
 * Get the Auto thread ID already associated with this guest's episode build,
 * if one exists. Returns null if no thread has been started yet.
 */
export async function getGuestEpisodeThreadId(guestId) {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('episode_thread_id')
    .eq('id', guestId)
    .maybeSingle();

  if (error || !data) return null;
  return data.episode_thread_id || null;
}

/**
 * Store the Auto thread ID for this guest's episode build so future
 * "Build episode" clicks resume the same conversation instead of starting over.
 */
export async function setGuestEpisodeThreadId(guestId, threadId) {
  const { error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update({ episode_thread_id: threadId })
    .eq('id', guestId);

  if (error) {
    console.error('[guestIntakeStore] Could not save episode_thread_id:', error.message);
  }
}

/**
 * Get multiple guests by id in one query. Used by the multi-guest episode
 * build flow. Returns only guests that were actually found — missing ids
 * are silently dropped, the caller should check the returned count against
 * the requested count if that matters.
 */
export async function getGuestsByIds(ids) {
  const cleanIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (cleanIds.length === 0) return { ok: true, guests: [] };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('*')
    .in('id', cleanIds);

  if (error) return { ok: false, error: error.message };
  return { ok: true, guests: data || [] };
}

/**
 * Set the same episode_thread_id on multiple guest records. This is how two
 * guests share one Auto conversation — both rows point at the same thread.
 */
export async function setEpisodeThreadIdForGuests(guestIds, threadId) {
  const cleanIds = Array.from(new Set((guestIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (cleanIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update({ episode_thread_id: threadId })
    .in('id', cleanIds);

  if (error) {
    console.error('[guestIntakeStore] Could not set episode_thread_id for multiple guests:', error.message);
  }
}

/**
 * Find the shared thread id if two or more of these guests are already
 * linked to the same episode build. Returns null if no shared thread exists
 * yet, meaning this would be a first click for this guest combination.
 */
export async function getSharedEpisodeThreadId(guestIds) {
  const cleanIds = Array.from(new Set((guestIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (cleanIds.length < 2) return null;

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('id, episode_thread_id')
    .in('id', cleanIds)
    .not('episode_thread_id', 'is', null);

  if (error || !data) return null;

  // A shared thread exists only if every requested guest has the same
  // non-null thread id. Partial overlap (one guest already has a solo
  // thread, the other doesn't) does not count as shared.
  if (data.length !== cleanIds.length) return null;

  const threadIds = new Set(data.map((row) => row.episode_thread_id));
  if (threadIds.size !== 1) return null;

  return data[0].episode_thread_id;
}

export function guestPostRecordingNotes(guest) {
  if (!guest) return null;
  const surprise = String(guest.post_recording_surprise || '').trim();
  const followUp = String(guest.post_recording_follow_up || '').trim();
  const landed = String(guest.post_recording_landed || '').trim();
  if (!surprise && !followUp && !landed) return null;
  return {
    post_recording_surprise: surprise,
    post_recording_follow_up: followUp,
    post_recording_landed: landed,
  };
}
