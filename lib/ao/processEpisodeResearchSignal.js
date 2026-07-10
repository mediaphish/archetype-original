import {
  getGuestById,
  searchGuests,
  updateGuestResearch,
  updateGuestQuestions,
} from './guestIntakeStore.js';

/**
 * Parses [EPISODE_RESEARCH_COMPLETE] signal from Auto's reply and:
 * 1. Extracts the research context Bart and Auto built together
 * 2. Generates a research brief from it using the same AI pattern as guest-research.js
 * 3. Generates suggested questions from the brief
 * 4. Saves both back to the guest record
 *
 * @param {string} reply - Full Auto reply text
 * @param {string} email - Authenticated user email
 * @returns {Promise<{ ok: boolean, guest_id?: string, error?: string }>}
 */
export async function processEpisodeResearchSignal(reply, email) {
  void email;

  try {
    const tagMatch = reply.match(/\[EPISODE_RESEARCH_COMPLETE([^\]]*)\]/i);
    if (!tagMatch) return { ok: false, error: 'No signal found' };

    const attrString = tagMatch[1] || '';
    const guestIdMatch = attrString.match(/guest_id="([^"]+)"/i);
    const guestNameMatch = attrString.match(/guest_name="([^"]+)"/i);
    const guestId = guestIdMatch?.[1]?.trim() || '';
    const guestName = guestNameMatch?.[1]?.trim() || '';

    if (!guestId && !guestName) return { ok: false, error: 'No guest_id or guest_name in signal' };

    const contextMatch = reply.match(/\[RESEARCH_CONTEXT\]([\s\S]*?)\[\/RESEARCH_CONTEXT\]/i);
    const researchContext = contextMatch?.[1]?.trim() || '';

    if (!researchContext || researchContext.length < 50) {
      return { ok: false, error: 'Research context too short or missing' };
    }

    let guest;
    if (guestId) {
      const result = await getGuestById(guestId);
      if (!result.ok) return { ok: false, error: `Guest not found: ${guestId}` };
      guest = result.guest;
    } else {
      const searchResult = await searchGuests({ query: guestName, limit: 1 });
      if (!searchResult.ok || !searchResult.guests?.length) {
        return { ok: false, error: `Guest not found by name: ${guestName}` };
      }
      const found = await getGuestById(searchResult.guests[0].id);
      if (!found.ok) return { ok: false, error: 'Could not load guest record' };
      guest = found.guest;
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

    const briefPrompt = `You are generating a research brief for a podcast host preparing to interview ${guest.name}.

GUEST INTAKE DATA:
Name: ${guest.name}
Company: ${guest.company || 'Not provided'}
Bio: ${guest.bio_md || 'Not provided'}

CONVERSATION CONTEXT (what the host shared privately about this guest):
${researchContext}

Generate a research brief (400-600 words) that synthesizes the intake data AND the private conversation context. The brief should help the host walk into the recording session with full command of:
- Who this person really is beneath the public profile
- The key moments and pivots in their story
- Angles worth exploring that aren't obvious
- Potential tension points or provocative questions
- How their values and faith (if relevant) show up in their work
- What will make this conversation memorable

Write in second person to the host ("You'll want to explore..."). Prose only, no bullets.`;

    const briefResponse = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: briefPrompt }],
    });

    const researchBrief = briefResponse.content?.[0]?.text?.trim() || '';
    if (!researchBrief) {
      return { ok: false, error: 'Empty research brief response' };
    }

    const questionsPrompt = `You are generating interview questions for a podcast host about to record with ${guest.name}.

RESEARCH BRIEF:
${researchBrief}

Generate 10 interview questions in two categories. Return as JSON only, no other text:

{
  "person_specific": [
    { "question": "...", "why": "One sentence on why this question matters for this guest" }
  ],
  "ao_theology": [
    { "question": "...", "why": "One sentence connecting this to Archetype Original's servant leadership framework" }
  ]
}

5 questions in each category. Person-specific questions dig into this guest's specific story and angles. AO theology questions connect their story to servant leadership, accountability, cultural conditions, power vs authority, or the other core themes of Archetype Original.`;

    const questionsResponse = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: questionsPrompt }],
    });

    let suggestedQuestions = null;
    try {
      const raw = questionsResponse.content?.[0]?.text?.trim() || '';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      suggestedQuestions = JSON.parse(cleaned);
    } catch (_) {
      // Questions parsing failed — still save the brief
    }

    const briefSave = await updateGuestResearch(guest.id, { research_brief: researchBrief });
    if (!briefSave.ok) {
      return { ok: false, error: briefSave.error || 'Could not save research brief' };
    }

    if (suggestedQuestions) {
      const questionsSave = await updateGuestQuestions(guest.id, {
        suggested_questions: suggestedQuestions,
      });
      if (!questionsSave.ok) {
        console.error('[processEpisodeResearchSignal] questions save failed:', questionsSave.error);
      }
    }

    return { ok: true, guest_id: guest.id };
  } catch (err) {
    console.error('[processEpisodeResearchSignal] error:', err?.message || err);
    return { ok: false, error: err?.message || 'Unknown error' };
  }
}
