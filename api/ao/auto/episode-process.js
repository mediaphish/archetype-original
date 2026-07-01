/**
 * POST /api/ao/auto/episode-process
 *
 * Body: {
 *   transcript: string,
 *   episode_type: "solo" | "guest",
 *   guest: { name, title, bio } | null,
 *   guest_id: string | null,
 *   recorded_date: string (ISO date),
 *   episode_brief: string | null
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { processEpisodeTranscript } from '../../../lib/ao/processEpisodeTranscript.js';
import { insertEpisodeDraft } from '../../../lib/ao/episodeDraftStore.js';
import { getGuestById, guestPostRecordingNotes } from '../../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const transcript = String(body.transcript || '').trim();
  const episode_type = body.episode_type === 'guest' ? 'guest' : 'solo';
  const guest = body.guest && typeof body.guest === 'object' ? body.guest : null;
  const guestId = String(body.guest_id || body.guest?.guest_id || '').trim() || null;
  const recorded_date = body.recorded_date ? String(body.recorded_date).split('T')[0] : null;
  const episode_brief = String(body.episode_brief || '').trim();

  if (!transcript) {
    return res.status(400).json({ ok: false, error: 'transcript is required' });
  }

  let research_brief = String(body.research_brief || '').trim();
  let post_recording = null;
  if (guestId) {
    const loadedGuest = await getGuestById(guestId);
    if (loadedGuest.ok && loadedGuest.guest) {
      if (!research_brief && loadedGuest.guest.research_brief) {
        research_brief = String(loadedGuest.guest.research_brief).trim();
      }
      post_recording = guestPostRecordingNotes(loadedGuest.guest);
    }
  }

  try {
    const processed = await processEpisodeTranscript({
      transcript,
      episode_type,
      guest,
      recorded_date,
      research_brief,
      episode_brief,
      post_recording,
    });

    if (!processed.ok) {
      return res.status(500).json({ ok: false, error: processed.error || 'Processing failed' });
    }

    const saved = await insertEpisodeDraft(auth.email, {
      episode_type,
      recorded_date,
      transcript,
      guest,
      guest_id: guestId,
      ...processed.processed,
      meta: { source: 'episode-process' },
    });

    if (!saved.ok) {
      const status = saved.error === 'episode_drafts_table_missing' ? 503 : 500;
      return res.status(status).json({
        ok: false,
        error:
          saved.error === 'episode_drafts_table_missing'
            ? 'Episode drafts table not installed. Run database/ao_episode_drafts.sql in Supabase.'
            : saved.error,
      });
    }

    return res.status(200).json({
      ok: true,
      draft: saved.draft,
      message: 'Episode draft ready for review.',
    });
  } catch (e) {
    console.error('[episode-process]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
}
