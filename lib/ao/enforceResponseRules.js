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
 * 1. [PUBLISH_JOURNAL] / [PUBLISH_DEVOTIONAL] never in same response as draft content
 * 2. Instagram captions never contain URLs in body — replaced with "Link in bio."
 * 3. [CARD] blocks without slot attribute get positional slots assigned
 * 4. More than 5 [CARD] blocks in one response — truncated to 5 with warning
 * 5. [CARD] block present without caption content — warning appended
 */

/**
 * Rule 1: Strip [PUBLISH_JOURNAL] or [PUBLISH_DEVOTIONAL] signals from any response
 * that also contains draft content ([JOURNAL_CONTENT] or [DEVOTIONAL_CONTENT]).
 * The signal fires the live publish route. It must never appear with draft text.
 */
function enforcePublishSignalIsolation(reply) {
  const hasJournalSignal = /\[PUBLISH_JOURNAL/i.test(reply);
  const hasDevotionalSignal = /\[PUBLISH_DEVOTIONAL/i.test(reply);
  const hasJournalContent = /\[JOURNAL_CONTENT\]/i.test(reply);
  const hasDevotionalContent = /\[DEVOTIONAL_CONTENT\]/i.test(reply);

  if (hasJournalSignal && hasJournalContent) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_JOURNAL] appeared in same response as [JOURNAL_CONTENT]. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The publish signal was removed from this response because it appeared alongside draft content. Send the draft for review first. The publish signal must appear alone in a dedicated response after Bart explicitly approves.]';
  }

  if (hasDevotionalSignal && hasDevotionalContent) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_DEVOTIONAL] appeared in same response as [DEVOTIONAL_CONTENT]. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The publish signal was removed from this response because it appeared alongside draft content. Send the draft for review first.]';
  }

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
 * Main enforcement function. Runs all rules in order.
 * Called from chat.js after model reply is received.
 *
 * @param {string} reply — raw model reply
 * @returns {string} — enforced reply
 */
export function enforceResponseRules(reply) {
  if (!reply) return reply;

  let result = reply;
  result = enforcePublishSignalIsolation(result);
  result = enforceInstagramCaptionRule(result);
  result = enforceCardSlotNumbers(result);
  result = enforceCardBatchLimit(result);
  result = enforceCardCaptionPairing(result);

  return result;
}
