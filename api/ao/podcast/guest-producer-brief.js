import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  getGuestById,
  updateGuestProducerBrief,
  guestToPublicView,
} from '../../../lib/ao/guestIntakeStore.js';
import { generateGuestProducerBrief } from '../../../lib/ao/generateGuestResearch.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const guestId = String(req.body?.guest_id || '').trim();
  const regenerate = Boolean(req.body?.regenerate);

  if (!guestId) {
    return res.status(400).json({ ok: false, error: 'guest_id required' });
  }

  try {
    const loaded = await getGuestById(guestId);
    if (!loaded.ok) {
      return res.status(404).json({ ok: false, error: 'Guest not found' });
    }

    const guest = loaded.guest;

    if (!regenerate && guest.producer_brief) {
      return res.status(200).json({
        ok: true,
        guest: guestToPublicView(guest),
        cached: true,
      });
    }

    if (regenerate) {
      await updateGuestProducerBrief(guestId, { clear: true });
    }

    const result = await generateGuestProducerBrief(guest);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Producer brief failed' });
    }

    const saved = await updateGuestProducerBrief(guestId, { producer_brief: result.producer_brief });
    if (!saved.ok) {
      return res.status(500).json({ ok: false, error: saved.error || 'Could not save producer brief' });
    }

    return res.status(200).json({
      ok: true,
      guest: guestToPublicView(saved.guest),
      cached: false,
    });
  } catch (err) {
    console.error('[ao/podcast/guest-producer-brief]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
