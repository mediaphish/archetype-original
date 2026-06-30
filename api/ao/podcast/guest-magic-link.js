import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getGuestById, guestToPublicView } from '../../../lib/ao/guestIntakeStore.js';
import { sendGuestMagicLinkEmail } from '../../../lib/ao/podcastGuestAuth.js';

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

    const sent = await sendGuestMagicLinkEmail({ guest: loaded.guest, req });
    if (!sent.ok) {
      return res.status(500).json({ ok: false, error: sent.error || 'Could not send magic link.' });
    }

    return res.status(200).json({
      ok: true,
      message: 'Magic link sent to guest.',
      guest: guestToPublicView(loaded.guest),
      ...(sent.link ? { link: sent.link } : {}),
    });
  } catch (err) {
    console.error('[ao/podcast/guest-magic-link]', err);
    return res.status(500).json({ ok: false, error: 'Failed to send magic link.' });
  }
}
