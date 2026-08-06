import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import {
  getPodcastEpisodeLink,
  setPodcastEpisodeLink,
  markPodcastEpisodeLinkSent,
} from '../../../../lib/ao/autoHub.js';
import { sendRecordingLinkEmail } from '../../../../lib/ao/podcastRecordingLinkEmail.js';
import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const threadId = String(req.query?.thread_id || '').trim();
      if (!threadId) {
        return res.status(400).json({ ok: false, error: 'thread_id required' });
      }

      const link = await getPodcastEpisodeLink(auth.email, threadId);
      return res.status(200).json({ ok: true, ...link });
    } catch (err) {
      console.error('[ao/podcast/episode/recording-link GET]', err);
      const status = err.message === 'Thread not found' ? 404 : 500;
      return res.status(status).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const threadId = String(body.thread_id || '').trim();
      const riversideLink = String(body.riverside_link || '').trim();
      const riversideEpisodeId = String(body.riverside_episode_id || '').trim() || null;
      const scheduledAt = String(body.scheduled_at || '').trim();
      const timezone = String(body.timezone || '').trim() || 'America/Chicago';

      if (!threadId) {
        return res.status(400).json({ ok: false, error: 'thread_id required' });
      }
      if (!riversideLink || !isValidHttpUrl(riversideLink)) {
        return res.status(400).json({ ok: false, error: 'riverside_link must be a valid URL' });
      }
      if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
        return res.status(400).json({ ok: false, error: 'scheduled_at must be a valid date' });
      }

      await setPodcastEpisodeLink(auth.email, threadId, {
        riverside_link: riversideLink,
        riverside_episode_id: riversideEpisodeId,
        scheduled_at: scheduledAt,
        timezone,
      });

      const { data: guests, error: guestsError } = await supabaseAdmin
        .from('ao_podcast_guests')
        .select('id, name, email')
        .eq('episode_thread_id', threadId);

      if (guestsError) {
        console.error('[ao/podcast/episode/recording-link guests]', guestsError);
        return res.status(500).json({ ok: false, error: guestsError.message || 'Could not load guests' });
      }

      const guestList = Array.isArray(guests) ? guests : [];
      if (guestList.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No guests found for this episode thread.',
        });
      }

      const results = await Promise.all(
        guestList.map(async (guest) => {
          const mail = await sendRecordingLinkEmail({
            guest,
            riversideLink,
            scheduledAt,
            timezone,
          });
          return {
            id: guest.id,
            name: guest.name || '',
            email: guest.email || '',
            ok: Boolean(mail.ok),
            error: mail.ok ? null : mail.error || 'send_failed',
            message_id: mail.id || null,
          };
        })
      );

      const sentCount = results.filter((r) => r.ok).length;
      if (sentCount > 0) {
        await markPodcastEpisodeLinkSent(auth.email, threadId, new Date().toISOString());
      }

      const saved = await getPodcastEpisodeLink(auth.email, threadId);

      return res.status(200).json({
        ok: true,
        results,
        sent_count: sentCount,
        guest_count: guestList.length,
        recording_link_sent_at: saved.recording_link_sent_at,
        partial: sentCount > 0 && sentCount < guestList.length,
      });
    } catch (err) {
      console.error('[ao/podcast/episode/recording-link POST]', err);
      const status = err.message === 'Thread not found' ? 404 : 500;
      return res.status(status).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
