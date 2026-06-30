import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  getGuestById,
  updateGuestQuestions,
  guestToPublicView,
} from '../../../lib/ao/guestIntakeStore.js';
import { generateGuestSuggestedQuestions } from '../../../lib/ao/generateGuestResearch.js';

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

    if (!guest.research_brief) {
      return res.status(400).json({ ok: false, error: 'Generate research brief first.' });
    }

    if (!regenerate && guest.suggested_questions) {
      return res.status(200).json({
        ok: true,
        guest: guestToPublicView(guest),
        cached: true,
      });
    }

    if (regenerate) {
      await updateGuestQuestions(guestId, { clear: true });
    }

    const result = await generateGuestSuggestedQuestions(guest);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Question generation failed' });
    }

    const saved = await updateGuestQuestions(guestId, {
      suggested_questions: result.suggested_questions,
    });
    if (!saved.ok) {
      return res.status(500).json({ ok: false, error: saved.error || 'Could not save questions' });
    }

    return res.status(200).json({
      ok: true,
      guest: guestToPublicView(saved.guest),
      cached: false,
    });
  } catch (err) {
    console.error('[ao/podcast/guest-questions]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
