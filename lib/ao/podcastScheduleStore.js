import { supabaseAdmin } from '../supabase-admin.js';

function rowToSlot(row) {
  if (!row) return null;
  const guest = row.guest || row.ao_podcast_guests || null;
  return {
    id: row.id,
    guest_id: row.guest_id || null,
    guest_name: guest?.name || null,
    episode_title: row.episode_title || '',
    scheduled_at: row.scheduled_at,
    notes: row.notes || '',
    created_at: row.created_at,
  };
}

export async function listUpcomingScheduleSlots() {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .select('id, guest_id, episode_title, scheduled_at, notes, created_at, guest:ao_podcast_guests(name)')
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

export async function createScheduleSlot(payload) {
  const scheduledAt = payload.scheduled_at;
  if (!scheduledAt) return { ok: false, error: 'scheduled_at required' };

  const { data, error } = await supabaseAdmin
    .from('ao_podcast_schedule')
    .insert({
      guest_id: payload.guest_id || null,
      episode_title: payload.episode_title || null,
      scheduled_at: scheduledAt,
      notes: payload.notes || null,
    })
    .select('id, guest_id, episode_title, scheduled_at, notes, created_at, guest:ao_podcast_guests(name)')
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
