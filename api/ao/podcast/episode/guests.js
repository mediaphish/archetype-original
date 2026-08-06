import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { guestToPublicView } from '../../../../lib/ao/guestIntakeStore.js';
import { guestHasScheduleSlot } from '../../../../lib/ao/podcastScheduleStore.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const threadId = String(req.query?.thread_id || '').trim();
  if (!threadId) {
    return res.status(400).json({ ok: false, error: 'thread_id required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_podcast_guests')
      .select('*')
      .eq('episode_thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ao/podcast/episode/guests]', error);
      return res.status(500).json({ ok: false, error: error.message || 'Could not load guests' });
    }

    const rows = Array.isArray(data) ? data : [];
    const guests = await Promise.all(
      rows.map(async (row) => {
        const has_scheduled_recording = await guestHasScheduleSlot(row.id);
        return {
          ...guestToPublicView(row),
          episode_thread_id: row.episode_thread_id || null,
          has_scheduled_recording,
        };
      })
    );

    return res.status(200).json({ ok: true, guests });
  } catch (err) {
    console.error('[ao/podcast/episode/guests]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
