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
import { storeImageSeriesMemory } from './editorialMemory.js';
import { logActivity } from './logActivity.js';
import { supabaseAdmin } from '../supabase-admin.js';
import { findReferencedDrafts } from './autoV2.js';
import { contentDrafts } from '../db/contentDrafts.js';

/**
 * Writes a freshly generated image straight onto the draft it belongs to, the
 * moment it is created -- instead of depending on a later [PUBLISH_JOURNAL
 * image_url="..."] tag to repeat the URL, which the model does not reliably do.
 * Uses the same slug-resolution approach already proven tonight for manually
 * attached images: an explicit series_slug/part_number on the signal itself
 * (most reliable, since Auto set it when firing DALLE_GENERATE), a literal
 * slug match in the message, or the same fuzzy title/slug matching already
 * used to link captions to posts. Never throws, and does nothing if no
 * confident match is found -- the image still shows in chat either way.
 */
async function trySaveGeneratedImageToDraft({ email, userMessage, recentHistory, signal, imageUrl }) {
  try {
    if (!email || !imageUrl) return;

    const msgLower = String(userMessage || '').toLowerCase();

    const { data: candidateDrafts, error: fetchErr } = await contentDrafts()
      .select('kind, series_slug, part_number, title, slug, status')
      .eq('created_by_email', email.toLowerCase().trim())
      .neq('status', 'published')
      .neq('status', 'abandoned')
      .neq('kind', 'session_brief')
      .neq('kind', 'captions')
      .neq('kind', 'content_constraint')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (fetchErr || !candidateDrafts?.length) return;

    let targetSlug = '';

    // Strategy 1 -- the DALLE_GENERATE signal itself already named the series/part.
    if (signal?.series_slug && signal?.part_number) {
      const partNum = parseInt(signal.part_number, 10);
      const bySeriesPart = candidateDrafts.find(
        (d) => d.series_slug === signal.series_slug && d.part_number === partNum
      );
      if (bySeriesPart?.slug) targetSlug = bySeriesPart.slug;
    }

    // Strategy 2 -- the exact slug of a known pending draft appears literally in the message.
    if (!targetSlug) {
      const literalMatch = candidateDrafts.find(
        (d) => d.slug && msgLower.includes(String(d.slug).toLowerCase())
      );
      if (literalMatch) targetSlug = literalMatch.slug;
    }

    // Strategy 3 -- same fuzzy title/slug matching already used to link captions to posts.
    if (!targetSlug) {
      const recentUserMessages = (recentHistory || [])
        .filter((m) => m.role === 'user')
        .map((m) => String(m.content || ''))
        .filter(Boolean)
        .slice(-5)
        .reverse();
      const fuzzyMatches = findReferencedDrafts(candidateDrafts, userMessage, recentUserMessages);
      const preferred =
        fuzzyMatches.find((d) => d.kind === 'journal') ||
        fuzzyMatches.find((d) => d.kind === 'devotional') ||
        fuzzyMatches[0];
      if (preferred?.slug) targetSlug = preferred.slug;
    }

    if (!targetSlug) return;

    const { error: updateError } = await contentDrafts()
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('slug', targetSlug)
      .in('kind', ['journal', 'devotional']);

    if (updateError) {
      console.error('[appendDesignImage] trySaveGeneratedImageToDraft update failed:', updateError.message);
    }
  } catch (err) {
    console.error('[appendDesignImage] trySaveGeneratedImageToDraft unexpected error:', err?.message || err);
  }
}

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
 * Derive series image metadata for storage in editorial memory.
 * Prefers explicit series_slug and part_number attributes from the [DALLE_GENERATE] signal.
 * Falls back to pattern detection from user message and label when attributes are absent.
 * Returns null when this cannot be identified as a series image.
 */
function deriveSeriesImageMeta({ userMessage, label, seriesSlug: explicitSeriesSlug, partNumber: explicitPartNumber }) {
  // Prefer explicit attributes from the signal — Auto should always include these for series images
  if (explicitSeriesSlug && explicitPartNumber) {
    const partNum = parseInt(explicitPartNumber, 10);
    if (Number.isFinite(partNum) && partNum >= 1) {
      const safeSlug = String(explicitSeriesSlug).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      return {
        seriesSlug: safeSlug,
        partNumber: partNum,
        partSlug: `${safeSlug}-part-${partNum}`,
      };
    }
  }

  // Fall back to pattern detection from user message and label
  const combined = `${userMessage || ''} ${label || ''}`.trim();
  if (!combined) return null;

  const seriesMatch = combined.match(
    /\b(power[-. ]vs[-. ]authority|judas[-. ]archetype|case[-. ]for[-. ]servant|psychology[-. ]of[-. ]servant|[a-z-]{8,}(?:\s+series)?)\b/i
  );
  const partMatch = combined.match(/\bpart\s+(\d+)\b/i);
  if (!seriesMatch || !partMatch) return null;

  const seriesSlug = seriesMatch[1].toLowerCase().replace(/[\s.]+/g, '-').replace(/[^a-z0-9-]/g, '');
  const partNumber = parseInt(partMatch[1], 10);
  if (!Number.isFinite(partNumber) || partNumber < 1) return null;

  return {
    seriesSlug,
    partNumber,
    partSlug: `${seriesSlug}-part-${partNumber}`,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.userMessage
 * @param {string} opts.reply - Auto's reply text (may contain [DALLE_GENERATE ...] signals)
 * @param {string} [opts.email] - owner email for editorial memory writes
 * @param {Array} [opts.recentHistory] - recent {role, content} messages, used to resolve which draft a generated image belongs to
 * @returns {Promise<string>} - Modified reply with [IMAGE_GENERATED] blocks appended
 */
export async function appendDesignImageToReplyIfNeeded({ userMessage, reply, email, recentHistory = [] }) {
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
        series_slug: attrs.series_slug || null,
        part_number: attrs.part_number || null,
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

        await logActivity({
          action_type: 'image_generated',
          source: 'appendDesignImageToReplyIfNeeded:DALLE_GENERATE',
          created_by_email: email || null,
          detail: {
            label: signal.label,
            image_url: result.image_url,
            size: signal.size,
            content_type: signal.content_type,
          },
        });

        if (email) {
          await trySaveGeneratedImageToDraft({
            email,
            userMessage,
            recentHistory,
            signal,
            imageUrl: result.image_url,
          });
        }

        const seriesMeta = deriveSeriesImageMeta({
          userMessage,
          label: signal.label,
          seriesSlug: signal.series_slug || null,
          partNumber: signal.part_number || null,
        });
        if (email && seriesMeta) {
          const memoryResult = await storeImageSeriesMemory({
            email,
            seriesSlug: seriesMeta.seriesSlug,
            partSlug: seriesMeta.partSlug,
            partNumber: seriesMeta.partNumber,
            imageUrl: result.image_url,
            prompt: signal.prompt,
            style: signal.content_type || 'journal_header',
            colorPalette: '',
          });
          if (!memoryResult.ok) {
            console.warn(
              `[appendDesignImage] Image generated successfully but series memory was NOT saved for ${seriesMeta.partSlug}: ${memoryResult.error}`
            );
          }
        }
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
