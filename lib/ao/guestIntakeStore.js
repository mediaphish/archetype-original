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
  const fields = 'id, name, email, company, image_url, submitted_at, research_brief, schedule_timezone';

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
    .select('id, name, email, company, image_url, submitted_at, research_brief', { count: 'exact' })
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
