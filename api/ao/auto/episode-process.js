/**
 * POST /api/ao/auto/episode-process
 *
 * Body: {
 *   transcript: string,
 *   episode_type: "solo" | "guest",
 *   guest: { name, title, bio } | null,
 *   recorded_date: string (ISO date)
 * }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { processEpisodeTranscript } from '../../../lib/ao/processEpisodeTranscript.js';
import { insertEpisodeDraft } from '../../../lib/ao/episodeDraftStore.js';

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
  const recorded_date = body.recorded_date ? String(body.recorded_date).split('T')[0] : null;

  if (!transcript) {
    return res.status(400).json({ ok: false, error: 'transcript is required' });
  }

  try {
    const processed = await processEpisodeTranscript({
      transcript,
      episode_type,
      guest,
      recorded_date,
    });

    if (!processed.ok) {
      return res.status(500).json({ ok: false, error: processed.error || 'Processing failed' });
    }

    const saved = await insertEpisodeDraft(auth.email, {
      episode_type,
      recorded_date,
      transcript,
      guest,
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
