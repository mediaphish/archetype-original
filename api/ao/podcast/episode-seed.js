import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { startNewAutoThread, addAutoMessage } from '../../../lib/ao/autoHub.js';
import { getGuestById, normalizeSocialLinks } from '../../../lib/ao/guestIntakeStore.js';

function linkedinUrlFromGuest(guest) {
  const links = normalizeSocialLinks(guest?.social_links);
  const linkedin = links.find((link) => link.platform === 'linkedin');
  return linkedin?.url || '';
}

function buildGuestEpisodeSeedMessage(guest) {
  const company = String(guest.company || '').trim() || '—';
  const bio = String(guest.bio_md || '').trim() || 'Not provided';
  const linkedin = linkedinUrlFromGuest(guest) || 'Not provided';
  const website = String(guest.website || '').trim() || 'Not provided';
  const surprise = String(guest.post_recording_surprise || '').trim() || 'Not captured yet';
  const landed = String(guest.post_recording_landed || '').trim() || 'Not captured yet';
  const followUp = String(guest.post_recording_follow_up || '').trim() || 'Not captured yet';
  const researchBrief = String(guest.research_brief || '').trim();

  return `Guest episode context loaded.

**Guest:** ${guest.name}
**Company:** ${company}
**Title:** —
**Bio:** ${bio}
**LinkedIn:** ${linkedin}
**Website:** ${website}

**Post-recording notes:**
- What surprised you: ${surprise}
- What landed: ${landed}
- Follow-up needed: ${followUp}

**Research brief:** ${researchBrief ? 'Available — loaded into context' : 'Not yet generated'}

Ready to build this episode. Upload the Riverside transcript when you're ready and I'll produce the full episode package.

[GUEST_ID: ${guest.id}]`;
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const guestId = String(req.body?.guest_id || '').trim();
    if (!guestId) {
      return res.status(400).json({ ok: false, error: 'guest_id is required' });
    }

    const loaded = await getGuestById(guestId);
    if (!loaded.ok || !loaded.guest) {
      return res.status(404).json({ ok: false, error: 'Guest not found' });
    }

    const thread = await startNewAutoThread(auth.email);
    const seedMessage = buildGuestEpisodeSeedMessage(loaded.guest);

    await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: 'plan',
      content: seedMessage,
      meta: { episode_seed: true, guest_id: guestId },
    });

    return res.status(200).json({ ok: true, thread_id: thread.id });
  } catch (err) {
    console.error('[ao/podcast/episode-seed]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
