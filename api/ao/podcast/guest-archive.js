/**
 * POST /api/ao/podcast/guest-archive
 *
 * Body: { guest_id, archived }  -> drop a guest off the working list, or restore.
 *
 * 2026-10-01. Bart had no way to clear finished guests off the list, so Erik and
 * Adam Theis sat there months after their episode shipped. Archiving is
 * reversible: their research, brief and intake answers are per person and stay
 * with them whether or not they are on the list.
 *
 * There is no delete here on purpose. Removing a real guest's record is not an
 * everyday action and should not sit one click from the list.
 */
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { setGuestArchived } from '../../../lib/ao/guestIntakeStore.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.body?.guest_id || '').trim();
  if (!guestId) {
    return res.status(400).json({ ok: false, error: 'guest_id is required' });
  }

  const archived = req.body?.archived !== false;

  const result = await setGuestArchived(guestId, archived);
  if (!result.ok) {
    return res.status(result.error === 'No guest with that id' ? 404 : 500).json(result);
  }

  return res.status(200).json({
    ok: true,
    guest: result.guest,
    message: archived ? 'Archived.' : 'Back on the list.',
  });
}
