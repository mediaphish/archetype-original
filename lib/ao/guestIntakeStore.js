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
  const fields = 'id, name, email, company, image_url, submitted_at';

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
