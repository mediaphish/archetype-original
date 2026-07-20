import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { getGuestById, updateGuestResearch, guestToPublicView } from '../../../lib/ao/guestIntakeStore.js';
import { generateGuestResearchBrief } from '../../../lib/ao/generateGuestResearch.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
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

    if (!regenerate && guest.research_brief) {
      return res.status(200).json({
        ok: true,
        guest: guestToPublicView(guest),
        cached: true,
      });
    }

    if (regenerate) {
      await updateGuestResearch(guestId, { clear: true });
    }

    const result = await generateGuestResearchBrief(guest);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Research failed' });
    }

    const saved = await updateGuestResearch(guestId, { research_brief: result.research_brief });
    if (!saved.ok) {
      return res.status(500).json({ ok: false, error: saved.error || 'Could not save research' });
    }

    return res.status(200).json({
      ok: true,
      guest: guestToPublicView(saved.guest),
      cached: false,
    });
  } catch (err) {
    console.error('[ao/podcast/guest-research]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
