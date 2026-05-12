/**
 * After caption approval, generate quote card PNGs from the prior assistant’s
 * captions artifact and append [IMAGES_GENERATED]…[/IMAGES_GENERATED] to the reply.
 * Called from chat.js (no HTTP self-fetch).
 */

import { generateQuoteCardImage } from './generateQuoteCardImage.js';

function parseCaptionBlocksIntoCardLines(captionContent) {
  const raw = String(captionContent || '').trim();
  if (!raw) return [];

  const parts = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const cards = [];

  for (const block of parts) {
    const b = block.replace(/^Card\s+\d+\s*\n/im, '').trim();
    const line1Match = b.match(/Power\s+says:\s*([^\n]+)/i);
    const line2Match = b.match(/Servant\s+leadership\s+says:\s*([^\n]+)/i);
    if (line1Match && line2Match) {
      cards.push({
        line1: `Power says: ${line1Match[1].trim()}`,
        line2: `Servant leadership says: ${line2Match[1].trim()}`,
      });
    }
  }

  return cards;
}

/**
 * @param {{ userMessage: string, priorMessages: Array<{ role: string, content?: string }>, reply: string }} args
 * @returns {Promise<string>} Updated reply (unchanged if nothing to do).
 */
export async function appendQuoteCardImagesToReplyIfNeeded({ userMessage, priorMessages, reply }) {
  const r = String(reply || '');
  if (!r) return reply;

  // Captions just presented in this same turn — do not generate yet.
  if (/\[ARTIFACT\s+type=["']captions["']/i.test(r)) return reply;

  const userApproved = /\b(approved?|looks good|go|confirm)\b/i.test(String(userMessage || ''));
  if (!userApproved) return reply;

  const priorRows = Array.isArray(priorMessages) ? priorMessages : [];
  const lastAssistant = [...priorRows].reverse().find((m) => m.role === 'assistant');
  const lastContent = String(lastAssistant?.content || '');
  const captionsMatch = lastContent.match(
    /\[ARTIFACT\s+type=["']captions["'][^\]]*\]([\s\S]*?)\[\/ARTIFACT\]/i
  );
  if (!captionsMatch) return reply;

  const captionContent = captionsMatch[1] || '';
  const cardSpecs = parseCaptionBlocksIntoCardLines(captionContent);

  const imageResults = (
    await Promise.all(
      cardSpecs.map(async (spec, i) => {
        try {
          const img = await generateQuoteCardImage({
            line1: spec.line1,
            line2: spec.line2,
            card_index: i + 1,
          });
          return img.ok && img.image_url ? { card: i + 1, image_url: img.image_url } : null;
        } catch (e) {
          console.error('[appendQuoteCardImages] card', i + 1, e?.message || e);
          return null;
        }
      })
    )
  ).filter(Boolean);

  if (imageResults.length === 0) return reply;

  const imageList = imageResults.map((x) => `Card ${x.card}: ${x.image_url}`).join('\n');
  return `${r}\n\n[IMAGES_GENERATED]\n${imageList}\n[/IMAGES_GENERATED]`;
}
