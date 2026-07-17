import { requireGuestSession } from '../../lib/ao/podcastGuestAuth.js';
import { getGuestById, guestToGuestSafeView } from '../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.query?.guest_id || '').trim();
  if (!guestId) {
    return res.status(400).json({ ok: false, error: 'guest_id required' });
  }

  const session = requireGuestSession(req, res, guestId);
  if (!session) return;

  const loaded = await getGuestById(guestId);
  if (!loaded.ok) {
    return res.status(404).json({ ok: false, error: 'Guest not found' });
  }

  if (String(loaded.guest.email || '').toLowerCase() !== session.email) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  return res.status(200).json({
    ok: true,
    guest: guestToGuestSafeView(loaded.guest),
    authenticated: true,
  });
}
