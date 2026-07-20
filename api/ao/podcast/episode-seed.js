import { requireOwnerSession } from '../../../lib/ao/requireAoSession.js';
import { startNewAutoThread, addAutoMessage } from '../../../lib/ao/autoHub.js';
import {
  getGuestById,
  normalizeSocialLinks,
  getGuestEpisodeThreadId,
  setGuestEpisodeThreadId,
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

    // If a thread already exists for this guest's episode build, resume it.
    // Do not create a new thread and do not re-run research that already happened.
    const existingThreadId = await getGuestEpisodeThreadId(guestId);
    if (existingThreadId) {
      return res.status(200).json({ ok: true, thread_id: existingThreadId, resumed: true });
    }

    // First click for this guest. Run research, questions, and producer brief
    // automatically before the thread opens, so Bart lands in a conversation
    // where the groundwork is already done instead of empty prompts to ask for it.
    let guest = loaded.guest;
    let researchJustRan = false;

    if (!guest.research_brief) {
      try {
        const researchResult = await generateGuestResearchBrief(guest);
        if (researchResult.ok) {
          const saved = await updateGuestResearch(guestId, { research_brief: researchResult.research_brief });
          if (saved.ok) {
            guest = saved.guest;
            researchJustRan = true;
          }
        } else {
          console.error('[episode-seed] Auto-research failed:', researchResult.error);
        }
      } catch (researchErr) {
        console.error('[episode-seed] Auto-research threw:', researchErr?.message || researchErr);
      }
    }

    if (guest.research_brief && !guest.suggested_questions) {
      try {
        const questionsResult = await generateGuestSuggestedQuestions(guest);
        if (questionsResult.ok) {
          const saved = await updateGuestQuestions(guestId, { suggested_questions: questionsResult.suggested_questions });
          if (saved.ok) guest = saved.guest;
        } else {
          console.error('[episode-seed] Auto-questions failed:', questionsResult.error);
        }
      } catch (questionsErr) {
        console.error('[episode-seed] Auto-questions threw:', questionsErr?.message || questionsErr);
      }
    }

    if (guest.research_brief && !guest.producer_brief) {
      try {
        const producerResult = await generateGuestProducerBrief(guest);
        if (producerResult.ok) {
          const saved = await updateGuestProducerBrief(guestId, { producer_brief: producerResult.producer_brief });
          if (saved.ok) guest = saved.guest;
        } else {
          console.error('[episode-seed] Auto-producer-brief failed:', producerResult.error);
        }
      } catch (producerErr) {
        console.error('[episode-seed] Auto-producer-brief threw:', producerErr?.message || producerErr);
      }
    }

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
