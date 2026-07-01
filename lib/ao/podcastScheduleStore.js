import { supabaseAdmin } from '../supabase-admin.js';
import { formatGuestSchedulePrefs } from './podcastScheduleUtils.js';

function rowToSlot(row) {
  if (!row) return null;
  const guest = row.guest || row.ao_podcast_guests || null;
  const guestPrefs = guest ? formatGuestSchedulePrefs(guest) : null;
  return {
    id: row.id,
    guest_id: row.guest_id || null,
    guest_name: guest?.name || null,
    guest_email: guest?.email || null,
    guest_schedule_prefs: guestPrefs,
    episode_title: row.episode_title || '',
    scheduled_at: row.scheduled_at,
    timezone: row.timezone || guest?.schedule_timezone || null,
    notes: row.notes || '',
    created_at: row.created_at,
  };
}

const SLOT_SELECT =
  'id, guest_id, episode_title, scheduled_at, timezone, notes, created_at, guest:ao_podcast_guests(name, email, schedule_preferred_days, schedule_preferred_time, schedule_avoid_dates, schedule_timezone)';

export async function listUpcomingScheduleSlots() {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select(SLOT_SELECT)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'schedule_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, slots: (data || []).map(rowToSlot) };
}

export async function getScheduleSlotById(id) {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select(SLOT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'schedule_table_missing' };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'slot_not_found' };
  return { ok: true, slot: rowToSlot(data) };
}

export async function createScheduleSlot(payload) {
  const scheduledAt = payload.scheduled_at;
  if (!scheduledAt) return { ok: false, error: 'scheduled_at required' };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .insert({
      guest_id: payload.guest_id || null,
      episode_title: payload.episode_title || null,
      scheduled_at: scheduledAt,
      timezone: payload.timezone || null,
      notes: payload.notes || null,
    })
    .select(SLOT_SELECT)
    .single();

  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'schedule_table_missing' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, slot: rowToSlot(data) };
}

export async function deleteScheduleSlot(id) {
  const { error } = await supabaseAdmin.from('ao_podcast_schedule').delete().eq('id', id);
  if (error) {
    if (String(error.message || '').includes('does not exist')) {
      return { ok: false, error: 'schedule_table_missing' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function guestHasScheduleSlot(guestId) {
  if (!guestId) return false;
  const { count, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', guestId);

  if (error) return false;
  return (count ?? 0) > 0;
}
