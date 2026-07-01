import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getGuestById, guestToPublicView } from '../../../lib/ao/guestIntakeStore.js';
import { guestHasScheduleSlot } from '../../../lib/ao/podcastScheduleStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.query?.id || req.query?.guest_id || '').trim();
  if (!guestId) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  const loaded = await getGuestById(guestId);
  if (!loaded.ok) {
    return res.status(404).json({ ok: false, error: 'Guest not found' });
  }

  const has_scheduled_recording = await guestHasScheduleSlot(guestId);

  return res.status(200).json({
    ok: true,
    guest: {
      ...guestToPublicView(loaded.guest),
      has_scheduled_recording,
    },
  });
}
