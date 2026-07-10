import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getGuestById, guestToPublicView, searchGuests } from '../../../lib/ao/guestIntakeStore.js';
import { guestHasScheduleSlot } from '../../../lib/ao/podcastScheduleStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.query?.id || req.query?.guest_id || '').trim();
  const guestName = String(req.query?.name || '').trim();

  if (!guestId && !guestName) {
    return res.status(400).json({ ok: false, error: 'id or name required' });
  }

  let loaded;

  if (guestId) {
    loaded = await getGuestById(guestId);
  } else {
    const result = await searchGuests({ query: guestName, limit: 1 });
    if (!result.ok || !result.guests || result.guests.length === 0) {
      return res.status(404).json({ ok: false, error: 'Guest not found' });
    }
    loaded = await getGuestById(result.guests[0].id);
  }

  if (!loaded.ok) {
    return res.status(404).json({ ok: false, error: 'Guest not found' });
  }

  const resolvedGuestId = loaded.guest.id;
  const has_scheduled_recording = await guestHasScheduleSlot(resolvedGuestId);

  return res.status(200).json({
    ok: true,
    guest: {
      ...guestToPublicView(loaded.guest),
      has_scheduled_recording,
    },
  });
}
