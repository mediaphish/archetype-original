/**
 * Append [IMAGES_GENERATED]…[/IMAGES_GENERATED] to Auto's reply when:
 * (1) Bart approves captions (same as before), or
 * (2) Bart plainly asks to create/generate images — then we pull card lines from
 *     the most recent relevant assistant content in this thread (captions, list,
 *     quote_card artifacts, or plain Power says / Servant leadership pairs).
 * Called from chat.js (no HTTP self-fetch).
 */

import { generateQuoteCardImage } from './generateQuoteCardImage.js';
import { supabaseAdmin } from '../supabase-admin.js';

/** Remove paragraphs that falsely deny server-side PNG generation (model habit / old training). */
function stripImageDenialParagraphs(text) {
  const paras = String(text || '').split(/\n\n+/);
  const deny = (p) =>
    /\bimage generation is not connected\b|\bcannot generate images?\b|\bI am a text-?\s*based system\b|\bnothing can be sent to design\b|\b(separate|external)\s+tool\b.{0,100}\bnot connected\b|\bI cannot generate images?\b|\bnot connected to this conversation\b/i.test(
      p
    );
  return paras.filter((p) => !deny(p)).join('\n\n').trim();
}

const IMAGE_OK_LEAD =
  'Your square quote card PNGs were generated on the AO server. Links are at the end of this message and in the panel on the right.\n\n';

function parseCaptionBlocksIntoCardLines(captionContent) {
  const raw = String(captionContent || '').trim();
  if (!raw) return [];

  const parts = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const cards = [];

  for (const block of parts) {
    const b = block
      .replace(/^\*{0,2}Card\s+\d+\*{0,2}\s*\n/im, '')
      .replace(/^Card\s+\d+\s*\n/im, '')
      .trim();
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

function parseSingleQuoteCardArtifactInner(inner) {
  const t = String(inner || '').trim();
  const line1Match = t.match(/Power\s+says:\s*([^\n]+)/i);
  const line2Match = t.match(/Servant\s+leadership\s+says:\s*([^\n]+)/i);
  if (!line1Match || !line2Match) return [];
  return [
    {
      line1: `Power says: ${line1Match[1].trim()}`,
      line2: `Servant leadership says: ${line2Match[1].trim()}`,
    },
  ];
}

function extractFromArtifactType(text, type) {
  const re = new RegExp(
    `\\[ARTIFACT\\s+type=["']${type}["'][^\\]]*\\]([\\s\\S]*?)\\[/ARTIFACT\\]`,
    'i'
  );
  const m = String(text || '').match(re);
  return m ? m[1] || '' : '';
}

/** Newest assistant messages first; return first non-empty card set found. */
function extractCardSpecsFromPriorMessages(priorMessages) {
  const rows = Array.isArray(priorMessages) ? priorMessages : [];
  const assistants = [...rows].filter((m) => m.role === 'assistant').reverse();

  for (const m of assistants) {
    const text = String(m.content || '');

    const capInner = extractFromArtifactType(text, 'captions');
    if (capInner) {
      const cards = parseCaptionBlocksIntoCardLines(capInner);
      if (cards.length) return dedupeCardSpecs(cards);
    }

    const listInner = extractFromArtifactType(text, 'list');
    if (listInner) {
      const cards = parseCaptionBlocksIntoCardLines(listInner);
      if (cards.length) return dedupeCardSpecs(cards);
    }

    const qcInner = extractFromArtifactType(text, 'quote_card');
    if (qcInner) {
      const cards = parseSingleQuoteCardArtifactInner(qcInner);
      if (cards.length) return dedupeCardSpecs(cards);
    }
  }

  const recentAssistantBlob = assistants
    .slice(0, 6)
    .map((m) => String(m.content || ''))
    .join('\n\n');
  const fromPlain = extractCardsFromPlainTextPairs(recentAssistantBlob);
  return dedupeCardSpecs(fromPlain);
}

function dedupeCardSpecs(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    const k = `${c.line1}||${c.line2}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function extractCardsFromPlainTextPairs(blob) {
  const cards = [];
  const re = /Power\s+says:\s*([^\n]+)\s*\n\s*Servant\s+leadership\s+says:\s*([^\n]+)/gi;
  let m;
  const s = String(blob || '');
  while ((m = re.exec(s)) !== null) {
    cards.push({
      line1: `Power says: ${m[1].trim()}`,
      line2: `Servant leadership says: ${m[2].trim()}`,
    });
  }
  return cards;
}

function userRequestedImageGeneration(userMessage) {
  const u = String(userMessage || '').toLowerCase();
  if (!u.trim()) return false;
  const patterns = [
    /\b(generate|create|make|build|render|export)\s+(the\s+)?(images?|pngs?|graphics?)\b/,
    /\b(generate|create|make|build|render|export)\s+(the\s+)?(card|quote)\s*(images?|graphics?)\b/,
    /\b(i\s+need|i\s+want)\s+(the\s+)?(images?|pngs?)\b/,
    /\b(can\s+we|could\s+you)\s+(please\s+)?(generate|create|make)\b.{0,40}\b(images?|pngs?)\b/,
    /\bwhere\s+(are|is)\s+(my\s+|the\s+)?(images?|pngs?)\b/,
    /\b(show|give)\s+me\s+(the\s+)?(images?|pngs?)\b/,
    /\b(image|images)\s+(now|please|for\s+these|for\s+the\s+cards?)\b/,
    /\b(images?|pngs?)\s+yet\b/,
    /\b(card|these|the)\s+images?\b/,
    /\b(pictures?|graphics?)\s+(for|of)\s+(the\s+)?(cards?|these)\b/,
  ];
  return patterns.some((re) => re.test(u));
}

/** Re-render all card PNGs (e.g. after logo fix) — do not reuse prior URLs in thread. */
function userRequestedImageRegeneration(userMessage) {
  const u = String(userMessage || '').toLowerCase();
  if (!u.trim()) return false;
  return (
    /\b(regenerat|rebuild|refresh|redo)\b.{0,40}\b(images?|pngs?|cards?)\b/.test(u) ||
    /\b(images?|pngs?|cards?)\b.{0,30}\b(regenerat|rebuild|refresh|redo)\b/.test(u) ||
    /\b(regenerat|rebuild|refresh)\b.{0,30}\b(card|quote)\s*(images?|pngs?)?\b/.test(u) ||
    /\b(fix|update|redo)\b.{0,40}\b(logo|images?)\b/.test(u) ||
    /\b(proper|correct)\s+logo\b/.test(u) ||
    /\blogo\b.{0,20}\b(fixed|correct|proper)\b/.test(u)
  );
}

async function generateAllPngs(cardSpecs, threadId, { forceNew = false } = {}) {
  // Deduplicate: if images for this exact thread already exist in the
  // [IMAGES_GENERATED] block of any prior message, return those URLs.
  // Skipped when Bart asks to regenerate (logo fix, refresh entire set).
  if (threadId && !forceNew) {
    try {
      const { data: rows } = await supabaseAdmin
        .from('ao_auto_messages')
        .select('content')
        .eq('thread_id', threadId)
        .eq('role', 'assistant')
        .like('content', '%[IMAGES_GENERATED]%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (rows && rows.length > 0) {
        const existing = String(rows[0].content || '');
        const match = existing.match(/\[IMAGES_GENERATED\]([\s\S]*?)\[\/IMAGES_GENERATED\]/);
        if (match) {
          const lines = match[1].trim().split('\n').filter(Boolean);
          const imgs = lines
            .map((line) => {
              const m = line.match(/Card (\d+): (https?:\/\/.+)/);
              return m ? { card: parseInt(m[1], 10), image_url: m[2].trim() } : null;
            })
            .filter(Boolean);
          // If we already have images for the same number of cards, reuse them
          if (imgs.length === cardSpecs.length) {
            console.log('[appendQuoteCardImages] Reusing', imgs.length, 'existing images from thread');
            return imgs;
          }
        }
      }
    } catch (e) {
      console.warn('[appendQuoteCardImages] Could not check existing images:', e?.message);
    }
  }

  return (
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
}

/**
 * @param {{ userMessage: string, priorMessages: Array<{ role: string, content?: string }>, reply: string, threadId?: string|null }} args
 * @returns {Promise<string>} Updated reply (unchanged if nothing to do).
 */
export async function appendQuoteCardImagesToReplyIfNeeded({
  userMessage,
  priorMessages,
  reply,
  threadId,
}) {
  const r = String(reply || '');
  if (!r) return reply;

  // Guard 1: current reply already has images
  if (/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/.test(r)) return r;

  const forceRegen = userRequestedImageRegeneration(userMessage);
  const wantImages = userRequestedImageGeneration(userMessage) || forceRegen;
  const userApproved = /\b(approved?|looks good|go|confirm)\b/i.test(String(userMessage || ''));

  // Guard 2: images were already generated in this thread for this batch.
  // Skip unless user is explicitly asking for images again (wantImages).
  // This prevents double-generation when Auto confirms images on the next turn.
  if (!wantImages) {
    const priorRows = Array.isArray(priorMessages) ? priorMessages : [];
    const alreadyGenerated = priorRows.some(
      (m) => m.role === 'assistant' && /\[IMAGES_GENERATED\]/.test(String(m.content || ''))
    );
    if (alreadyGenerated) return r;
  }

  const newReplyHasCaptionsArtifact = /\[ARTIFACT\s+type=["']captions["']/i.test(r);

  let cardSpecs = [];

  if (wantImages) {
    cardSpecs = extractCardSpecsFromPriorMessages(priorMessages);
  } else if (userApproved && !newReplyHasCaptionsArtifact) {
    const priorRows = Array.isArray(priorMessages) ? priorMessages : [];
    const lastAssistant = [...priorRows].reverse().find((m) => m.role === 'assistant');
    const lastContent = String(lastAssistant?.content || '');
    const captionsMatch = lastContent.match(
      /\[ARTIFACT\s+type=["']captions["'][^\]]*\]([\s\S]*?)\[\/ARTIFACT\]/i
    );
    if (captionsMatch) {
      cardSpecs = parseCaptionBlocksIntoCardLines(captionsMatch[1] || '');
    }
  }

  if (cardSpecs.length === 0) {
    if (wantImages) {
      const note =
        '\n\n— AO: No Power says / Servant leadership pairs were found in earlier messages in this thread, so the image renderer had nothing to draw. Confirm the list or captions block is still above, then ask again for images.\n';
      const cleaned = stripImageDenialParagraphs(r);
      return cleaned ? `${cleaned}${note}` : `${r}${note}`;
    }
    return r;
  }

  const imageResults = await generateAllPngs(cardSpecs, threadId, { forceNew: forceRegen });
  if (imageResults.length === 0) {
    const note =
      '\n\n— AO: The image renderer ran but no files were saved. Try again in a moment; if it keeps failing, flag it for a technical check.\n';
    if (wantImages || userApproved) return `${r}${note}`;
    return r;
  }

  const imageList = imageResults.map((x) => `Card ${x.card}: ${x.image_url}`).join('\n');
  const body = stripImageDenialParagraphs(r);
  const lead = forceRegen
    ? 'Fresh square quote card PNGs were generated with the current AO logo (50% white at the bottom). New links are below and in the panel on the right. If you already scheduled posts, use Publish again or update the queue so scheduled posts pick up these new files.\n\n'
    : IMAGE_OK_LEAD;
  return `${lead}${body}\n\n[IMAGES_GENERATED]\n${imageList}\n[/IMAGES_GENERATED]`;
}
