import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  getGuestById,
  updateGuestPostRecording,
  guestToPublicView,
} from '../../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.body?.guest_id || '').trim();
  if (!guestId) {
    return res.status(400).json({ ok: false, error: 'guest_id required' });
  }

  try {
    const loaded = await getGuestById(guestId);
    if (!loaded.ok) {
      return res.status(404).json({ ok: false, error: 'Guest not found' });
    }

    const saved = await updateGuestPostRecording(guestId, {
      post_recording_surprise: req.body?.post_recording_surprise,
      post_recording_follow_up: req.body?.post_recording_follow_up,
      post_recording_landed: req.body?.post_recording_landed,
    });

    if (!saved.ok) {
      return res.status(500).json({ ok: false, error: saved.error || 'Could not save notes' });
    }

    return res.status(200).json({
      ok: true,
      guest: guestToPublicView(saved.guest),
    });
  } catch (err) {
    console.error('[ao/podcast/guest-post-recording]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
