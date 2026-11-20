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

    // 2026-11-20: Cam saves the recording-day run sheet on the guest's episode
    // draft (meta.run_sheet_md). The Show tab needs it; it was never shown here.
    const runSheets = {};
    if (rows.length) {
      const { data: drafts } = await supabaseAdmin
        .from('ao_episode_drafts')
        .select('guest_id, meta, updated_at')
        .in('guest_id', rows.map((r) => r.id))
        .order('updated_at', { ascending: false });
      for (const d of drafts || []) {
        const md = d?.meta?.run_sheet_md;
        if (d.guest_id && md && !runSheets[d.guest_id]) runSheets[d.guest_id] = String(md);
      }
    }
    const guests = await Promise.all(
      rows.map(async (row) => {
        const has_scheduled_recording = await guestHasScheduleSlot(row.id);
        return {
          ...guestToPublicView(row),
          episode_thread_id: row.episode_thread_id || null,
          has_scheduled_recording,
          run_sheet_md: runSheets[row.id] || null,
        };
      })
    );

    return res.status(200).json({ ok: true, guests });
  } catch (err) {
    console.error('[ao/podcast/episode/guests]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
