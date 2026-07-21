import {
  getGuestById,
  searchGuests,
  updateGuestResearch,
  updateGuestQuestions,
} from './guestIntakeStore.js';

/**
 * Parse all [EPISODE_RESEARCH_COMPLETE] signals from a reply. Returns an
 * array of { guestId, guestName, researchContext } — one entry per signal.
 * Signals with missing or too-short context are silently skipped.
 */
function extractResearchSignals(reply) {
  const signals = [];

  // Match every [EPISODE_RESEARCH_COMPLETE ...] tag and the [RESEARCH_CONTEXT]
  // block that follows it, before the next signal tag or end of string.
  // Pattern: find the opening tag, then capture everything up to the next
  // [EPISODE_RESEARCH_COMPLETE or end of string, then extract the
  // [RESEARCH_CONTEXT] block from within that segment.
  const tagPattern = /\[EPISODE_RESEARCH_COMPLETE([^\]]*)\]/gi;
  let match;

  // Collect all tag positions and attributes first
  const tagMatches = [];
  while ((match = tagPattern.exec(reply)) !== null) {
    tagMatches.push({ index: match.index, attrString: match[1] || '', fullLength: match[0].length });
  }

  for (let i = 0; i < tagMatches.length; i++) {
    const { index, attrString, fullLength } = tagMatches[i];
    const segmentStart = index + fullLength;
    // Segment runs from end of this tag to start of the next tag (or end of reply)
    const segmentEnd = i + 1 < tagMatches.length ? tagMatches[i + 1].index : reply.length;
    const segment = reply.slice(segmentStart, segmentEnd);

    const guestIdMatch = attrString.match(/guest_id="([^"]+)"/i);
    const guestNameMatch = attrString.match(/guest_name="([^"]+)"/i);
    const guestId = guestIdMatch?.[1]?.trim() || '';
    const guestName = guestNameMatch?.[1]?.trim() || '';

    if (!guestId && !guestName) continue;

    const contextMatch = segment.match(/\[RESEARCH_CONTEXT\]([\s\S]*?)\[\/RESEARCH_CONTEXT\]/i);
    const researchContext = contextMatch?.[1]?.trim() || '';

    if (!researchContext || researchContext.length < 50) continue;

    signals.push({ guestId, guestName, researchContext });
  }

  return signals;
}

async function resolveGuest(guestId, guestName) {
  if (guestId) {
    const result = await getGuestById(guestId);
    if (!result.ok) return { ok: false, error: `Guest not found: ${guestId}` };
    return { ok: true, guest: result.guest };
  }
  const searchResult = await searchGuests({ query: guestName, limit: 1 });
  if (!searchResult.ok || !searchResult.guests?.length) {
    return { ok: false, error: `Guest not found by name: ${guestName}` };
  }
  const found = await getGuestById(searchResult.guests[0].id);
  if (!found.ok) return { ok: false, error: 'Could not load guest record' };
  return { ok: true, guest: found.guest };
}

async function processSingleResearchSignal(guest, researchContext, anthropic, model) {
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
  if (!researchBrief) return { ok: false, error: 'Empty research brief response' };

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
  if (!briefSave.ok) return { ok: false, error: briefSave.error || 'Could not save research brief' };

  if (suggestedQuestions) {
    const questionsSave = await updateGuestQuestions(guest.id, { suggested_questions: suggestedQuestions });
    if (!questionsSave.ok) {
      console.error('[processEpisodeResearchSignal] questions save failed for', guest.id, questionsSave.error);
    }
  }

  return { ok: true, guest_id: guest.id };
}

/**
 * Parses all [EPISODE_RESEARCH_COMPLETE] signals from Auto's reply and for
 * each one: resolves the guest record, generates a research brief and question
 * set from the conversation context, and saves both to the guest record.
 *
 * Handles single-guest and multi-guest episodes. For multi-guest episodes,
 * each guest gets their own brief and questions generated and saved independently.
 *
 * @param {string} reply - Full Auto reply text
 * @param {string} email - Authenticated user email (unused but kept for consistency)
 * @returns {Promise<{ ok: boolean, guest_id?: string, guest_ids?: string[], error?: string }>}
 */
export async function processEpisodeResearchSignal(reply, email) {
  void email;

  try {
    const signals = extractResearchSignals(reply);

    if (signals.length === 0) {
      return { ok: false, error: 'No valid research signals found' };
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

    const results = [];

    // Process each signal sequentially — Anthropic calls are rate-limited and
    // these are sequential by design rather than parallel to avoid hitting rate
    // limits when processing multiple guests in a single reply.
    for (const signal of signals) {
      const resolved = await resolveGuest(signal.guestId, signal.guestName);
      if (!resolved.ok) {
        console.error('[processEpisodeResearchSignal] Could not resolve guest:', resolved.error);
        results.push({ ok: false, error: resolved.error });
        continue;
      }

      const result = await processSingleResearchSignal(
        resolved.guest,
        signal.researchContext,
        anthropic,
        model
      );

      results.push(result);

      if (result.ok) {
        console.log('[processEpisodeResearchSignal] Research saved for guest:', result.guest_id);
      } else {
        console.error('[processEpisodeResearchSignal] Failed for guest:', resolved.guest.id, result.error);
      }
    }

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    if (successes.length === 0) {
      return { ok: false, error: failures.map((f) => f.error).join('; ') };
    }

    if (signals.length === 1) {
      return { ok: true, guest_id: successes[0].guest_id };
    }

    return {
      ok: true,
      guest_ids: successes.map((r) => r.guest_id),
      partial: failures.length > 0,
      failures: failures.length > 0 ? failures.map((f) => f.error) : undefined,
    };
  } catch (err) {
    console.error('[processEpisodeResearchSignal] error:', err?.message || err);
    return { ok: false, error: err?.message || 'Unknown error' };
  }
}
