import { getGuestById } from '../../lib/ao/guestIntakeStore.js';
import { sendGuestMagicLinkEmail } from '../../lib/ao/podcastGuestAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const guestId = String(req.body?.guest_id || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!guestId || !email) {
      return res.status(400).json({ ok: false, error: 'guest_id and email are required.' });
    }

    const loaded = await getGuestById(guestId);
    if (!loaded.ok) {
      return res.status(404).json({ ok: false, error: 'Guest not found.' });
    }

    const guest = loaded.guest;
    if (String(guest.email || '').toLowerCase().trim() !== email) {
      return res.status(403).json({ ok: false, error: 'Email does not match this guest record.' });
    }

    const sent = await sendGuestMagicLinkEmail({ guest, req });
    if (!sent.ok) {
      return res.status(500).json({ ok: false, error: sent.error || 'Could not send magic link.' });
    }

    return res.status(200).json({
      ok: true,
      message: 'Magic link sent.',
      ...(sent.link ? { link: sent.link } : {}),
    });
  } catch (err) {
    console.error('[guest-magic-link]', err);
    return res.status(500).json({ ok: false, error: 'Failed to send magic link.' });
  }
}
