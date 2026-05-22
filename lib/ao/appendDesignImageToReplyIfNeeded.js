/**
 * appendDesignImageToReplyIfNeeded
 *
 * Mirrors appendQuoteCardImagesAfterApproval.js but for DALL-E 3 journal/social images.
 *
 * Detects when Auto's reply contains a [DALLE_GENERATE] signal block, extracts
 * the prompt and metadata, calls generateDesignImage, and appends the result
 * as an [IMAGE_GENERATED] block to the reply.
 *
 * Signal format Auto must use in its reply:
 * [DALLE_GENERATE prompt="..." size="1536x1024" content_type="journal_header" label="..."]
 */

import { generateDesignImage } from './generateDesignImage.js';

function parseAttributes(attrString) {
  const attrs = {};
  const pattern = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/**
 * @param {object} opts
 * @param {string} opts.userMessage
 * @param {string} opts.reply - Auto's reply text (may contain [DALLE_GENERATE ...] signals)
 * @returns {Promise<string>} - Modified reply with [IMAGE_GENERATED] blocks appended
 */
export async function appendDesignImageToReplyIfNeeded({ userMessage, reply }) {
  if (!reply) return reply;

  const signals = [];
  const pattern = /\[DALLE_GENERATE([^\]]*)\]/gi;
  let match;

  while ((match = pattern.exec(reply)) !== null) {
    const attrs = parseAttributes(match[1]);
    if (attrs.prompt) {
      signals.push({
        fullMatch: match[0],
        prompt: attrs.prompt,
        size: attrs.size || '1536x1024',
        content_type: attrs.content_type || 'journal_header',
        label: attrs.label || 'Generated Image',
      });
    }
  }

  if (signals.length === 0) return reply;

  let modifiedReply = reply;
  const generatedBlocks = [];

  for (const signal of signals) {
    try {
      console.log(`[appendDesignImage] Generating: ${signal.label} — ${signal.prompt.slice(0, 80)}...`);
      const result = await generateDesignImage({
        prompt: signal.prompt,
        content_type: signal.content_type,
        title: signal.label,
        size: signal.size,
      });

      if (result.ok && result.image_url) {
        generatedBlocks.push(
          `[IMAGE_GENERATED label="${signal.label}" url="${result.image_url}" size="${signal.size}"]`
        );
        modifiedReply = modifiedReply.replace(signal.fullMatch, '');
      } else {
        console.warn(`[appendDesignImage] Generation failed for ${signal.label}:`, result.error);
        modifiedReply = modifiedReply.replace(
          signal.fullMatch,
          `[Image generation failed for ${signal.label}: ${result.error || 'unknown error'}]`
        );
      }
    } catch (err) {
      console.error(`[appendDesignImage] Error for ${signal.label}:`, err?.message || err);
      modifiedReply = modifiedReply.replace(
        signal.fullMatch,
        `[Image generation error for ${signal.label}: ${err?.message || 'unknown'}]`
      );
    }
  }

  if (generatedBlocks.length > 0) {
    modifiedReply = modifiedReply.trimEnd() + '\n\n' + generatedBlocks.join('\n');
  }

  return modifiedReply;
}
