import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { startNewAutoThread, addAutoMessage } from '../../../lib/ao/autoHub.js';
import {
  getGuestById,
  normalizeSocialLinks,
  getGuestEpisodeThreadId,
  setGuestEpisodeThreadId,
  getGuestsByIds,
  setEpisodeThreadIdForGuests,
  getSharedEpisodeThreadId,
  updateGuestResearch,
  updateGuestQuestions,
  updateGuestProducerBrief,
} from '../../../lib/ao/guestIntakeStore.js';
import {
  generateGuestResearchBrief,
  generateGuestSuggestedQuestions,
  generateGuestProducerBrief,
} from '../../../lib/ao/generateGuestResearch.js';

function linkedinUrlFromGuest(guest) {
  const links = normalizeSocialLinks(guest?.social_links);
  const linkedin = links.find((link) => link.platform === 'linkedin');
  return linkedin?.url || '';
}

function buildGuestEpisodeSeedMessage(guest, researchJustRan) {
  const company = String(guest.company || '').trim() || '—';
  const bio = String(guest.bio_md || '').trim() || 'Not provided';
  const linkedin = linkedinUrlFromGuest(guest) || 'Not provided';
  const website = String(guest.website || '').trim() || 'Not provided';
  const surprise = String(guest.post_recording_surprise || '').trim() || 'Not captured yet';
  const landed = String(guest.post_recording_landed || '').trim() || 'Not captured yet';
  const followUp = String(guest.post_recording_follow_up || '').trim() || 'Not captured yet';
  const researchBrief = String(guest.research_brief || '').trim();
  const questionsReady = !!guest.suggested_questions;
  const producerBriefReady = !!guest.producer_brief;

  const researchLine = researchJustRan
    ? 'Available — generated automatically and loaded into context'
    : researchBrief
    ? 'Available — loaded into context'
    : 'Not available. Something went wrong generating it — ask me to try again.';

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

**Research brief:** ${researchLine}
**Suggested questions:** ${questionsReady ? 'Ready' : 'Not yet generated'}
**Producer brief:** ${producerBriefReady ? 'Ready' : 'Not yet generated'}

${researchJustRan ? 'Research, questions, and the producer brief were generated automatically when this episode build started. ' : ''}Ready to build this episode. Upload the Riverside transcript when you're ready and I'll produce the full episode package.

[GUEST_ID: ${guest.id}]`;
}

function buildMultiGuestEpisodeSeedMessage(guests, researchJustRanFor) {
  const sections = guests.map((guest) => {
    const company = String(guest.company || '').trim() || '—';
    const bio = String(guest.bio_md || '').trim() || 'Not provided';
    const linkedin = linkedinUrlFromGuest(guest) || 'Not provided';
    const researchBrief = String(guest.research_brief || '').trim();
    const questionsReady = !!guest.suggested_questions;
    const producerBriefReady = !!guest.producer_brief;

    const researchLine = researchJustRanFor.includes(guest.id)
      ? 'Available — generated automatically and loaded into context'
      : researchBrief
      ? 'Available — loaded into context'
      : 'Not available. Something went wrong generating it — ask me to try again.';

    return `**Guest:** ${guest.name}
**Company:** ${company}
**Bio:** ${bio}
**LinkedIn:** ${linkedin}
**Research brief:** ${researchLine}
**Suggested questions:** ${questionsReady ? 'Ready' : 'Not yet generated'}
**Producer brief:** ${producerBriefReady ? 'Ready' : 'Not yet generated'}

[GUEST_ID: ${guest.id}]`;
  });

  const names = guests.map((g) => g.name).join(' and ');

  return `Multi-guest episode context loaded.

This episode has ${guests.length} guests: ${names}. Hold context on all of them
together — this is one conversation, not separate threads per person. When
building the episode, structure it as a conversation between all guests, not
${guests.length} solo interviews stitched together. Watch for dynamics between
them specifically, since that's often the most interesting material in a
multi-guest format.

---

${sections.join('\n\n---\n\n')}

---

Ready to research. Ask me anything about ${names}, or share what you already
know about them and I'll build from there.`;
}

async function ensureGuestPrep(guest) {
  let g = guest;
  let researchJustRan = false;

  if (!g.research_brief) {
    try {
      const researchResult = await generateGuestResearchBrief(g);
      if (researchResult.ok) {
        const saved = await updateGuestResearch(g.id, { research_brief: researchResult.research_brief });
        if (saved.ok) {
          g = saved.guest;
          researchJustRan = true;
        }
      } else {
        console.error(`[episode-seed] Auto-research failed for ${g.id}:`, researchResult.error);
      }
    } catch (err) {
      console.error(`[episode-seed] Auto-research threw for ${g.id}:`, err?.message || err);
    }
  }

  if (g.research_brief && !g.suggested_questions) {
    try {
      const questionsResult = await generateGuestSuggestedQuestions(g);
      if (questionsResult.ok) {
        const saved = await updateGuestQuestions(g.id, { suggested_questions: questionsResult.suggested_questions });
        if (saved.ok) g = saved.guest;
      } else {
        console.error(`[episode-seed] Auto-questions failed for ${g.id}:`, questionsResult.error);
      }
    } catch (err) {
      console.error(`[episode-seed] Auto-questions threw for ${g.id}:`, err?.message || err);
    }
  }

  if (g.research_brief && !g.producer_brief) {
    try {
      const producerResult = await generateGuestProducerBrief(g);
      if (producerResult.ok) {
        const saved = await updateGuestProducerBrief(g.id, { producer_brief: producerResult.producer_brief });
        if (saved.ok) g = saved.guest;
      } else {
        console.error(`[episode-seed] Auto-producer-brief failed for ${g.id}:`, producerResult.error);
      }
    } catch (err) {
      console.error(`[episode-seed] Auto-producer-brief threw for ${g.id}:`, err?.message || err);
    }
  }

  return { guest: g, researchJustRan };
}

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const rawGuestIds = req.body?.guest_ids;
    const guestIds = Array.isArray(rawGuestIds)
      ? rawGuestIds.map((id) => String(id || '').trim()).filter(Boolean)
      : req.body?.guest_id
      ? [String(req.body.guest_id).trim()]
      : [];

    if (guestIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'guest_id or guest_ids is required' });
    }

    const isMultiGuest = guestIds.length > 1;

    if (isMultiGuest) {
      // Check if this exact combination already has a shared thread. Resume it
      // rather than starting over.
      const existingSharedThreadId = await getSharedEpisodeThreadId(guestIds);
      if (existingSharedThreadId) {
        return res.status(200).json({ ok: true, thread_id: existingSharedThreadId, resumed: true });
      }

      const loadedGuests = await getGuestsByIds(guestIds);
      if (!loadedGuests.ok || loadedGuests.guests.length !== guestIds.length) {
        return res.status(404).json({ ok: false, error: 'One or more guests not found' });
      }

      let guestsList = loadedGuests.guests;
      const researchJustRanFor = [];

      // Run research, questions, and producer brief for each guest that's
      // missing it, in parallel across guests.
      await Promise.all(
        guestsList.map(async (guest, idx) => {
          const prepared = await ensureGuestPrep(guest);
          guestsList[idx] = prepared.guest;
          if (prepared.researchJustRan) researchJustRanFor.push(prepared.guest.id);
        })
      );

      const thread = await startNewAutoThread(auth.email);
      const seedMessage = buildMultiGuestEpisodeSeedMessage(guestsList, researchJustRanFor);

      await addAutoMessage({
        threadId: thread.id,
        role: 'assistant',
        mode: 'plan',
        content: seedMessage,
        meta: { episode_seed: true, multi_guest: true, guest_ids: guestIds },
      });

      await setEpisodeThreadIdForGuests(guestIds, thread.id);

      return res.status(200).json({ ok: true, thread_id: thread.id, resumed: false });
    }

    // --- Single-guest path (5-I behavior) ---
    const guestId = guestIds[0];

    const loaded = await getGuestById(guestId);
    if (!loaded.ok || !loaded.guest) {
      return res.status(404).json({ ok: false, error: 'Guest not found' });
    }

    // If a thread already exists for this guest's episode build, resume it.
    // Do not create a new thread and do not re-run research that already happened.
    const existingThreadId = await getGuestEpisodeThreadId(guestId);
    if (existingThreadId) {
      return res.status(200).json({ ok: true, thread_id: existingThreadId, resumed: true });
    }

    const prepared = await ensureGuestPrep(loaded.guest);
    const guest = prepared.guest;
    const researchJustRan = prepared.researchJustRan;

    const thread = await startNewAutoThread(auth.email);
    const seedMessage = buildGuestEpisodeSeedMessage(guest, researchJustRan);

    await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: 'plan',
      content: seedMessage,
      meta: { episode_seed: true, guest_id: guestId },
    });

    // Remember this thread so future clicks resume it instead of starting over.
    await setGuestEpisodeThreadId(guestId, thread.id);

    return res.status(200).json({ ok: true, thread_id: thread.id, resumed: false });
  } catch (err) {
    console.error('[ao/podcast/episode-seed]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
