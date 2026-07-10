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
 * 1. [PUBLISH_JOURNAL] / [PUBLISH_DEVOTIONAL] must include content blocks — stripped if missing
 * 2. Instagram captions never contain URLs in body — replaced with "Link in bio."
 * 3. [CARD] blocks without slot attribute get positional slots assigned
 * 4. More than 5 [CARD] blocks in one response — truncated to 5 with warning
 * 5. [CARD] block present without caption content — warning appended
 * 6. Unknown bracket-style signal tags — visible warning appended
 * 7. Voice violations — banned words, phrases, em dashes, stacked paragraphs flagged
 */

/**
 * Rule 1: Strip [PUBLISH_JOURNAL] or [PUBLISH_DEVOTIONAL] when they appear WITHOUT
 * the corresponding content block. Signal and content must travel together.
 */
function enforcePublishSignalIsolation(reply) {
  const hasJournalSignal = /\[PUBLISH_JOURNAL/i.test(reply);
  const hasDevotionalSignal = /\[PUBLISH_DEVOTIONAL/i.test(reply);
  const hasJournalContent = /\[JOURNAL_CONTENT\]/i.test(reply);
  const hasDevotionalContent = /\[DEVOTIONAL_CONTENT\]/i.test(reply);

  // [PUBLISH_JOURNAL] WITHOUT [JOURNAL_CONTENT] is the real problem —
  // it means Auto is trying to publish without providing the article text.
  // Strip it and warn.
  if (hasJournalSignal && !hasJournalContent) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_JOURNAL] appeared without [JOURNAL_CONTENT]. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The publish signal was removed because no article content was included. The [PUBLISH_JOURNAL] signal must always include a [JOURNAL_CONTENT]...[/JOURNAL_CONTENT] block with the full article text.]';
  }

  // [PUBLISH_DEVOTIONAL] WITHOUT [DEVOTIONAL_CONTENT] — same rule.
  if (hasDevotionalSignal && !hasDevotionalContent) {
    console.warn('[enforceResponseRules] BLOCKED: [PUBLISH_DEVOTIONAL] appeared without [DEVOTIONAL_CONTENT]. Signal stripped.');
    const stripped = reply.replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '');
    return stripped + '\n\n[AUTO NOTE: The devotional publish signal was removed because no content was included.]';
  }

  // [PUBLISH_JOURNAL] WITH [JOURNAL_CONTENT] — this is correct. Allow it through.
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
  'EPISODE_DRAFT',
  'SOCIAL_CAPTIONS',
  'CAPTION',
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
 * Rule 7: Voice enforcement — detect banned words, phrases, and constructions
 * from Bart's established voice rules. These are already documented in the
 * system prompt. This rule enforces them in code so Auto cannot slip them
 * through by ignoring the prompt.
 *
 * Does NOT strip the content — Bart sees exactly what Auto wrote.
 * Appends a visible warning listing every violation found, so Bart
 * can reject the response immediately rather than having to catch it himself.
 *
 * Skips [CARD] blocks, [JOURNAL_CONTENT] blocks, and [DEVOTIONAL_CONTENT] blocks
 * because those contain Bart's own voice, not Auto's narration.
 */

const BANNED_WORDS = [
  'delve', 'delving', 'delved',
  'underscore', 'underscores', 'underscored', 'underscoring',
  'bolster', 'bolsters', 'bolstered', 'bolstering',
  'foster', 'fosters', 'fostered', 'fostering',
  'harness', 'harnessing', 'harnessed',
  'unpack', 'unpacking', 'unpacked',
  'pivotal',
  'groundbreaking',
  'transformative',
  'robust',
  'seamless', 'seamlessly',
  'intricate', 'intricately',
  'vibrant',
  'multifaceted',
  'holistic',
  'testament',
  'straightforward',
  'comprehensive', 'comprehensively',
  'cutting-edge',
  'game-changing', 'game-changer',
  'impactful',
  'crucial',
  'furthermore',
  'moreover',
];

const BANNED_PHRASES = [
  "it's worth noting",
  "it is worth noting",
  "at its core",
  "at the end of the day",
  "in today's fast-paced world",
  "here's the thing",
  "let's dive in",
  "let's dive into",
  "dive into",
  "dive deep",
  "unlocking the potential",
  "plays a crucial role",
  "it cannot be overstated",
  "in conclusion",
  "this highlights",
  "one of the most important",
  "as we navigate",
  "it's not just",
  "it is not just",
  "not only X but also",
  "not only",
  "shed light on",
  "pave the way",
  "in many ways",
  "genuinely",
  "honestly",
];

function stripContentBlocks(text) {
  return text
    // Remove Bart's voice content blocks
    .replace(/\[JOURNAL_CONTENT\][\s\S]*?\[\/JOURNAL_CONTENT\]/gi, '')
    .replace(/\[DEVOTIONAL_CONTENT\][\s\S]*?\[\/DEVOTIONAL_CONTENT\]/gi, '')
    .replace(/\[CARD[\s\S]*?\[\/CARD\]/gi, '')
    .replace(/\[ARTIFACT[\s\S]*?\[\/ARTIFACT\]/gi, '')
    // Remove [DALLE_GENERATE] and [IMAGE_GENERATED] signal tags.
    // These contain em dashes and special characters in their attribute values
    // (e.g. label="Power vs. Authority: Part 3 — The Test") that are not prose violations.
    // Strip the entire tag before scanning so attribute content is never checked.
    .replace(/\[DALLE_GENERATE[^\]]*\]/gi, '')
    .replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '')
    .replace(/\[IMAGES_GENERATED[^\]]*\]/gi, '')
    // Remove [EPISODE_PROCESS] signals and their content blocks for the same reason
    .replace(/\[EPISODE_PROCESS[^\]]*\]/gi, '')
    .replace(/\[EPISODE_TRANSCRIPT\][\s\S]*?\[\/EPISODE_TRANSCRIPT\]/gi, '')
    // Remove [PUBLISH_JOURNAL] and [PUBLISH_DEVOTIONAL] opening tags (not content blocks —
    // those are already stripped above, but the opening signal tag itself may contain
    // attribute values with special characters)
    .replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '')
    .replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '')
    // Remove [SOCIAL_CAPTIONS] blocks — captions are Bart's voice, not Auto's narration
    .replace(/\[SOCIAL_CAPTIONS\][\s\S]*?\[\/SOCIAL_CAPTIONS\]/gi, '')
    // Remove [CAPTION] tags
    .replace(/\[CAPTION[^\]]*\][\s\S]*?\[\/CAPTION\]/gi, '')
    .replace(/\[SEED_MANIFEST[^\]]*\]/gi, '')
    // Remove prior enforcement warning blocks that were appended to earlier responses.
    // These blocks contain em dashes and banned phrases in their own warning text,
    // which cause false positives when thread history is re-evaluated.
    .replace(/---\s*\n\*\*⚠️ (VOICE VIOLATION|SYSTEM WARNING)[^]*?(?=\n---|\n\n#|\n\n\*\*[A-Z]|$)/gi, '')
    .replace(/\[AUTO NOTE:[^\]]*\]/gi, '')
    // Remove response metadata lines that look like single-sentence paragraphs.
    // These are slug lines, word count lines, and status lines Auto appends to responses.
    // The stacked paragraph check must not count these as prose paragraphs.
    .replace(/^\*\*Slug:\*\*.*$/gm, '')
    .replace(/^\*\*Estimated word count:\*\*.*$/gm, '')
    .replace(/^\*\*Word count:\*\*.*$/gm, '')
    .replace(/^\*\*Series:\*\*.*$/gm, '')
    .replace(/^Ready for your (approval|edits|review).*$/gm, '')
    .replace(/^Full draft delivered\..*$/gm, '')
    .replace(/^Approved captions.*$/gm, '')
    .replace(/^All \d+ cards.*$/gm, '')
    // Remove quoted original sentences from correction blocks
    // (lines beginning with "Original:" that Auto uses when showing corrections)
    .replace(/^Original:.*$/gm, '')
    .replace(/^Already clean\. No fix needed\..*$/gm, '');
}

function enforceVoiceRules(reply) {
  if (!reply) return reply;

  // Only scan Auto's narration, not content blocks containing Bart's voice
  const scanTarget = stripContentBlocks(reply);

  const violations = [];

  // Check for em dashes — use a fresh non-stateful regex each call
  // to avoid lastIndex state bugs from the global flag
  if (/\u2014/.test(scanTarget)) {
    violations.push('Em dash (—) present in draft. Rewrite those sentences without it.');
  }

  // Check banned words (whole word match, case insensitive)
  for (const word of BANNED_WORDS) {
    const re = new RegExp(`\\b${word.replace(/-/g, '[-]?')}\\b`, 'i');
    if (re.test(scanTarget)) {
      violations.push(`Banned word: "${word}"`);
    }
  }

  // Check banned phrases (case insensitive)
  for (const phrase of BANNED_PHRASES) {
    if (scanTarget.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`Banned phrase: "${phrase}"`);
    }
  }

  // Check for stacked single-sentence paragraphs
  // Five or more consecutive paragraphs that are each a single sentence = AI signature pattern
  const paragraphs = scanTarget.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  let consecutiveSingleSentence = 0;
  let maxConsecutive = 0;
  for (const para of paragraphs) {
    // Count as single sentence if it contains 0 or 1 sentence-ending punctuation
    const sentenceCount = (para.match(/[.!?]+(\s|$)/g) || []).length;
    if (sentenceCount <= 1 && para.length > 0) {
      consecutiveSingleSentence++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveSingleSentence);
    } else {
      consecutiveSingleSentence = 0;
    }
  }
  if (maxConsecutive >= 5) {
    violations.push(`Stacked single-sentence paragraphs (${maxConsecutive} in a row) — AI signature pattern. Combine into real paragraphs.`);
  }

  if (violations.length === 0) return reply;

  console.warn(`[enforceResponseRules] VOICE VIOLATIONS DETECTED: ${violations.join(' | ')}`);

  return reply + `\n\n---\n**⚠️ VOICE VIOLATION — PROSE ONLY:** ${violations.length} banned item${violations.length > 1 ? 's' : ''} found in this response:\n${violations.map(v => `- ${v}`).join('\n')}\n\nFix the prose violations above. Do not regenerate images. Do not re-fire signals. Do not repeat any approved work. Only the specific text violations need to be corrected. Rewrite the affected sentences and re-deliver the prose only.`;
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
  result = enforceKnownSignalsOnly(result);
  result = enforceVoiceRules(result);

  return result;
}
