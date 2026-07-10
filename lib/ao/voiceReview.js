/**
 * voiceReview.js
 *
 * Automated post-generation voice reviewer for Auto V2.
 *
 * Runs after Auto generates a reply, before the response reaches Bart.
 * Checks for AI signature writing patterns (em dashes, banned phrases,
 * hollow constructions) and rewrites violations automatically.
 *
 * Only fires on long-form content (>800 characters).
 * Short conversational replies pass through unchanged.
 *
 * Signal tags ([CARD], [DALLE_GENERATE], [PUBLISH_JOURNAL], etc.)
 * are preserved exactly — the reviewer is instructed not to touch them.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createCompleteMessage } from './anthropicCompleteMessage.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const REVIEW_MODEL = 'claude-sonnet-4-6';

// Voice review fires on content longer than MIN_LENGTH_FOR_REVIEW.
// Short conversational replies pass through unchanged.
const MIN_LENGTH_FOR_REVIEW = 800;

const REVIEWER_SYSTEM_PROMPT = `You are a voice reviewer for Bart Paden's content system. Your only job is to read a piece of writing, find AI signature patterns that violate his voice rules, and return the corrected version.

Bart's content must never contain AI fingerprints. His readers and clients must never be able to identify that AI was involved. Your job is the last automated gate before content reaches him.

## WHAT YOU ARE CHECKING FOR

### EM DASHES — ZERO TOLERANCE
Find every em dash (— or --) and eliminate it. Replace with a comma, a period, or rewrite as two sentences. Do not leave a single one. This is the highest-priority violation.

### BANNED WORDS
Find and replace any of these. Rewrite the sentence so the meaning is preserved without the flagged word:
delve, dive (figurative), navigate (figurative), underscore, bolster, foster, harness, leverage (figurative), unpack, shed light on, pave the way, pivotal, groundbreaking, cutting-edge, transformative, game-changing, robust, comprehensive, seamless, intricate, nuanced (as empty praise), vibrant, multifaceted, holistic, testament, realm, landscape (figurative), furthermore, moreover, crucial, vital (as filler), impactful, significant (as filler), key (as filler)

### BANNED PHRASES
Find and rewrite any of these:
- "It's worth noting" / "It's important to note" / "It's worth mentioning"
- "At its core" / "At the end of the day" / "When it comes to" / "In many ways"
- "In today's fast-paced world" / any "In today's [adjective] [noun]" opener
- "This is where it gets interesting" / "But here's the thing" / "Here's the thing"
- "Something shifted" / "Everything changed" used as unearned transitions
- "Let's break it down" / "Let's dive in" / "Let's explore"
- "Unlocking the potential of" / "Harnessing the power of"
- "Plays a crucial role" / "It cannot be overstated" / "It goes without saying"
- "Reflecting a broader trend" / "Marking a significant shift"
- "In conclusion" / "To summarize" / "In summary" used as closing restaters
- "This highlights" / "This underscores" / "This demonstrates" used as hollow connectors
- "One of the most important" / "One of the most significant"

### BANNED CONSTRUCTIONS
Find and rewrite:
- False contrast: "It's not just X, it's Y" or "Not X, but Y" used for hollow drama
- Three-beat triads used reflexively as rhetorical filler
- Mid-sentence questions used for false drama: "But now? Here's what changed."
- Formulaic openers: Any sentence that begins "As [group] continues to [verb]..."
- Closing summaries that restate rather than close with a real thought

## WHAT YOU MUST NEVER CHANGE

Signal tags must pass through exactly as written. Do not modify, move, reformat, or remove any of these:
- [CARD] ... [/CARD] blocks
- [LINE] ... [/LINE] tags inside CARD blocks
- [DALLE_GENERATE ...] tags
- [PUBLISH_JOURNAL ...] tags
- [PUBLISH_DEVOTIONAL ...] tags
- [ARTIFACT ...] ... [/ARTIFACT] blocks
- [IMAGES_GENERATED] ... [/IMAGES_GENERATED] blocks
- [IMAGE_GENERATED ...] tags
- [EPISODE_PROCESS ...] tags
- [EPISODE_TRANSCRIPT] ... [/EPISODE_TRANSCRIPT] blocks
- [JOURNAL_CONTENT] ... [/JOURNAL_CONTENT] blocks
- [DEVOTIONAL_CONTENT] ... [/DEVOTIONAL_CONTENT] blocks

## HOW TO RESPOND

If you find violations:
Return the complete rewritten text with all violations corrected. Do not add any preamble, explanation, or notes about what you changed. Return only the corrected content, ready to deliver.

If you find no violations:
Return the text exactly as given. Do not add any preamble or explanation. Return only the original content.

Do not truncate. Return the full text every time, whether rewritten or unchanged.`;

/**
 * Reviews a reply for AI voice signatures and rewrites if violations are found.
 *
 * @param {string} reply - The raw reply from Auto before delivery to Bart
 * @returns {Promise<string>} - The cleaned reply (or original if clean / too short / error)
 */
export async function reviewAndCleanVoice(reply) {
  if (!reply || reply.length < MIN_LENGTH_FOR_REVIEW) {
    return reply;
  }

  try {
    const completed = await createCompleteMessage(client, {
      model: REVIEW_MODEL,
      max_tokens: 8000,
      system: REVIEWER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Review this content and return the corrected version:\n\n${reply}`,
        },
      ],
    });

    if (!completed.ok) {
      console.error(
        '[Voice Review] Incomplete review — using original reply:',
        completed.error
      );
      return reply;
    }

    const reviewed = completed.text;

    if (!reviewed || !reviewed.trim()) {
      console.error('[Voice Review] Reviewer returned empty response — using original');
      return reply;
    }

    // If the reviewed output is significantly shorter than the original,
    // the reviewer likely truncated. Return the original to avoid partial delivery.
    if (reviewed.trim().length < reply.length * 0.7) {
      console.warn('[Voice Review] Reviewer output significantly shorter than input — possible truncation. Using original.');
      return reply;
    }

    if (completed.continuation_count > 0) {
      console.log(
        `[Voice Review] Long-form continuation: ${completed.continuation_count} extra call(s)`
      );
    }

    // Detect whether the reviewer actually made changes
    const changed = reviewed.trim() !== reply.trim();
    if (changed) {
      console.log('[Voice Review] Violations found — rewriting');
    } else {
      console.log('[Voice Review] Clean — no rewrite needed');
    }

    return reviewed.trim();
  } catch (err) {
    // A reviewer failure must never block the response
    console.error('[Voice Review] Error — using original reply:', err?.message || err);
    return reply;
  }
}
