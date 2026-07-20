/**
 * enforceResponseRules.js
 *
 * Code-level enforcement of Auto response rules.
 * These rules were previously in the system prompt as instructions to the model.
 * Moving them here makes them guaranteed rather than suggested.
 *
 * Called from chat.js after the model reply is received, before saving to thread.
 *
 * Rules enforced:
 * 1. [PUBLISH_JOURNAL] / [PUBLISH_DEVOTIONAL] must include content blocks — stripped if missing unless content appeared in recent thread history
 * 2. Instagram captions never contain URLs in body — replaced with "Link in bio."
 * 3. [CARD] blocks without slot attribute get positional slots assigned
 * 4. More than 5 [CARD] blocks in one response — truncated to 5 with warning
 * 5. [CARD] block present without caption content — warning appended
 * 6. Unknown bracket-style signal tags — visible warning appended
 */

/**
 * Rule 1: Strip [PUBLISH_JOURNAL] or [PUBLISH_DEVOTIONAL] when they appear WITHOUT
 * the corresponding content block — UNLESS the content block appeared in recent
 * thread history (within the last 6 messages). This allows Auto to fire the signal
 * in a dedicated response after content was approved in a prior message, which is
 * the correct publish workflow.
 */
function enforcePublishSignalIsolation(reply, recentHistory = []) {
  const hasJournalSignal = /\[PUBLISH_JOURNAL/i.test(reply);
  const hasDevotionalSignal = /\[PUBLISH_DEVOTIONAL/i.test(reply);
  const hasJournalContent = /\[JOURNAL_CONTENT\]/i.test(reply);
  const hasDevotionalContent = /\[DEVOTIONAL_CONTENT\]/i.test(reply);

  // Check recent thread history for content blocks approved in prior messages
  const recentText = recentHistory
    .slice(-6)
    .map((m) => String(m.content || ''))
    .join('\n');
  const hasJournalContentInHistory = /\[JOURNAL_CONTENT\]/i.test(recentText);
  const hasDevotionalContentInHistory = /\[DEVOTIONAL_CONTENT\]/i.test(recentText);

  // [PUBLISH_JOURNAL] WITHOUT [JOURNAL_CONTENT] in this message OR recent history
  // This means Auto is trying to publish without having provided the article text at all.
  // Strip it and warn.
  if (hasJournalSignal && !hasJournalContent && !hasJournalContentInHistory) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_JOURNAL] appeared without [JOURNAL_CONTENT] in message or recent history. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The publish signal was removed because no article content was found in this message or recent thread history. The [PUBLISH_JOURNAL] signal requires a [JOURNAL_CONTENT]...[/JOURNAL_CONTENT] block either in the same response or in a recent prior message.]';
  }

  // [PUBLISH_DEVOTIONAL] WITHOUT [DEVOTIONAL_CONTENT] in this message OR recent history
  if (hasDevotionalSignal && !hasDevotionalContent && !hasDevotionalContentInHistory) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_DEVOTIONAL] appeared without [DEVOTIONAL_CONTENT] in message or recent history. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The devotional publish signal was removed because no content was found in this message or recent thread history.]';
  }

  // Signal with content present — correct. Allow through.
  return reply;
}

/**
 * Rule 2: Strip URLs from Instagram caption content in [SOCIAL_CAPTIONS] blocks.
 * Instagram captions must never contain URLs in the body.
 * Replace any URL with "Link in bio." if not already present.
 */
function enforceInstagramCaptionRule(reply) {
  if (!/\[SOCIAL_CAPTIONS\]/i.test(reply)) return reply;

  return reply.replace(
    /(\[SOCIAL_CAPTIONS\])([\s\S]*?)(\[\/SOCIAL_CAPTIONS\])/gi,
    (fullMatch, open, content, close) => {
      // Find instagram_business section and clean URLs from it
      const cleaned = content.replace(
        /(instagram_business\s*:\s*)([\s\S]*?)(?=\n\s*\w+_\w+\s*:|$)/gi,
        (sectionMatch, label, captionText) => {
          if (!captionText.includes('Link in bio')) {
            const noUrls = captionText.replace(/https?:\/\/[^\s]+/g, '').trim();
            return `${label}${noUrls}\n\nLink in bio.`;
          }
          const noUrls = captionText.replace(/https?:\/\/[^\s]+/g, '').trim();
          return `${label}${noUrls}`;
        }
      );
      return `${open}${cleaned}${close}`;
    }
  );
}

/**
 * Rule 3: Assign positional slot numbers to [CARD] blocks missing the slot attribute.
 * The slot attribute is required for the panel's card count to be accurate.
 * When missing, assign sequentially starting from 1 within this response.
 */
function enforceCardSlotNumbers(reply) {
  if (!/\[CARD/i.test(reply)) return reply;

  let slotCounter = 0;
  return reply.replace(/\[CARD(?![^\]]*\bslot=)([^\]]*)\]/gi, (match, attrs) => {
    slotCounter++;
    console.warn(`[enforceResponseRules] [CARD] block missing slot attribute — assigned slot="${slotCounter}"`);
    return `[CARD slot="${slotCounter}"${attrs}]`;
  });
}

/**
 * Rule 4: Truncate responses with more than 5 [CARD] blocks to exactly 5.
 * More than 5 [CARD] blocks in one response causes output truncation errors.
 */
function enforceCardBatchLimit(reply) {
  const cardBlocks = [];
  const cardRe = /\[CARD[\s\S]*?\[\/CARD\]/gi;
  let m;
  while ((m = cardRe.exec(reply)) !== null) {
    cardBlocks.push({ match: m[0], index: m.index });
  }

  if (cardBlocks.length <= 5) return reply;

  console.warn(`[enforceResponseRules] Response contained ${cardBlocks.length} [CARD] blocks — truncating to 5.`);

  // Remove all card blocks beyond the first 5
  let result = reply;
  // Remove from last to first to preserve indices
  for (let i = cardBlocks.length - 1; i >= 5; i--) {
    const block = cardBlocks[i];
    result = result.slice(0, block.index) + result.slice(block.index + block.match.length);
  }

  return result + `\n\n[AUTO NOTE: This response contained ${cardBlocks.length} cards. Only the first 5 were rendered. The remaining ${cardBlocks.length - 5} will follow in the next response.]`;
}

/**
 * Rule 5: Warn when [CARD] blocks are present but no caption content follows.
 * Cards and captions must always travel together.
 */
function enforceCardCaptionPairing(reply) {
  if (!/\[CARD[\s\S]*?\[\/CARD\]/i.test(reply)) return reply;

  // Check for caption indicators after the last [/CARD] block
  const lastCardEnd = reply.lastIndexOf('[/CARD]');
  const afterCards = reply.slice(lastCardEnd + 7);

  const hasCaptions =
    /LinkedIn Personal/i.test(afterCards) ||
    /LinkedIn Business/i.test(afterCards) ||
    /Instagram Business/i.test(afterCards) ||
    /Facebook Business/i.test(afterCards) ||
    /\bCaption/i.test(afterCards) ||
    /\[ARTIFACT\s+type=["']captions["']/i.test(afterCards);

  if (!hasCaptions) {
    console.warn('[enforceResponseRules] [CARD] blocks found without caption content. Cards and captions must travel together.');
    return reply + '\n\n[AUTO NOTE: Card captions are missing from this response. Cards and captions must always be delivered together. Please provide the full 7-channel caption set for each card.]';
  }

  return reply;
}

/**
 * Rule 6: Detect bracket-style tags that are not real, wired-up signals.
 * Auto has twice fabricated its own signal syntax ([SCHEDULE_POSTS], [SOCIAL_POSTS])
 * that no code anywhere parses. Those responses looked like they did something
 * and did nothing, silently. This rule catches any top-level bracket tag not on
 * the known-real list and appends a loud, visible warning so the failure is
 * immediately obvious instead of discovered later by Bart clicking around.
 *
 * This does NOT touch [LINE...] or [/LINE] or [/CARD] etc — only top-level
 * signal-style opening tags with the shape [WORD ...] or [WORD].
 */
const KNOWN_REAL_SIGNALS = new Set([
  'CARD',
  'LINE',
  'ARTIFACT',
  'SEED_MANIFEST',
  'PUBLISH_JOURNAL',
  'JOURNAL_CONTENT',
  'PUBLISH_DEVOTIONAL',
  'DEVOTIONAL_CONTENT',
  'DALLE_GENERATE',
  'IMAGE_GENERATED',
  'IMAGES_GENERATED',
  'EPISODE_PROCESS',
  'EPISODE_TRANSCRIPT',
  'EPISODE_SHOW_NOTES',
  'EPISODE_GUESTS',
  'EPISODE_DRAFT',
  'EPISODE_RESEARCH_COMPLETE',
  'RESEARCH_CONTEXT',
  'NAVIGATE_TO',
  'SOCIAL_CAPTIONS',
  'CAPTION',
  'UPDATE_SCHEDULED_CAPTIONS',
  'GUEST_ID',
  'EDIT_PUBLISHED',
]);

function enforceKnownSignalsOnly(reply) {
  const tagPattern = /\[\/?([A-Z_]+)(?:\s[^\]]*)?\]/g;
  const fabricated = new Set();
  let match;
  while ((match = tagPattern.exec(reply)) !== null) {
    const tagName = match[1];
    if (!KNOWN_REAL_SIGNALS.has(tagName)) {
      fabricated.add(tagName);
    }
  }

  if (fabricated.size === 0) return reply;

  const list = Array.from(fabricated).map((t) => `[${t}]`).join(', ');
  console.warn(`[enforceResponseRules] FABRICATED SIGNAL DETECTED: ${list}`);

  return (
    reply +
    `\n\n---\n**⚠️ SYSTEM WARNING:** This response contained a signal tag (${list}) that does not correspond to any real system action. Nothing was scheduled, published, or saved. This is a fabrication — Auto invented syntax that no code reads. Do not treat anything above this line as having actually happened. Ask Auto to use one of its real signals instead: [PUBLISH_JOURNAL], [PUBLISH_DEVOTIONAL], [CARD], [DALLE_GENERATE], or [EPISODE_PROCESS].`
  );
}

/**
 * Main enforcement function. Runs all rules in order.
 * Called from chat.js after model reply is received.
 *
 * @param {string} reply — raw model reply
 * @param {Array} recentHistory — optional array of recent thread messages for context-aware rules
 * @returns {string} — enforced reply
 */
export function enforceResponseRules(reply, recentHistory = []) {
  if (!reply) return reply;

  let result = reply;
  result = enforcePublishSignalIsolation(result, recentHistory);
  result = enforceInstagramCaptionRule(result);
  result = enforceCardSlotNumbers(result);
  result = enforceCardBatchLimit(result);
  result = enforceCardCaptionPairing(result);
  result = enforceKnownSignalsOnly(result);

  return result;
}
