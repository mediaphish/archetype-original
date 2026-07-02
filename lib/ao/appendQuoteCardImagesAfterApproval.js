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

  // If no paired cards found, try all other formats
  if (cards.length === 0) {
    return extractCardsFromPlainTextPairs(raw);
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

  const recentBlob = rows
    .slice(-20)
    .map((m) => String(m.content || ''))
    .join('\n\n');
  const fromPlain = extractCardsFromPlainTextPairs(recentBlob);
  return dedupeCardSpecs(fromPlain);
}

function dedupeCardSpecs(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    const k = c.card_spec ? c.card_spec : `${c.line1}||${c.line2}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function extractCardsFromPlainTextPairs(blob) {
  const cards = [];
  const s = String(blob || '');

  // Format 1: [CARD]...[/CARD] flexible layout blocks
  // Validation: if any block contains a Power says line, it must also contain
  // a Servant leadership says line in the same block. Split pairs are rejected
  // and logged as errors so the failure is visible rather than rendering silently wrong.
  const flexRe = /(\[CARD[\s\S]*?\[\/CARD\])/gi;
  let m;
  const rawBlocks = [];
  while ((m = flexRe.exec(s)) !== null) {
    rawBlocks.push(m[1].trim());
  }

  if (rawBlocks.length > 0) {
    const validatedBlocks = [];
    for (const block of rawBlocks) {
      const hasPowerSays = /Power\s+says:/i.test(block);
      const hasServantSays = /Servant\s+leadership\s+says:/i.test(block);

      if (hasPowerSays && !hasServantSays) {
        // Reject: Power says without Servant leadership says in same block
        console.error(
          '[appendQuoteCardImages] REJECTED split card — Power says line found without Servant leadership says in same [CARD] block. Auto output these as separate blocks which breaks the pairing. Block contents:',
          block.slice(0, 200)
        );
        // Do not push this block — it will not render
        continue;
      }

      if (!hasPowerSays && hasServantSays) {
        // Reject: Servant leadership says without Power says in same block
        console.error(
          '[appendQuoteCardImages] REJECTED split card — Servant leadership says line found without Power says in same [CARD] block.',
          block.slice(0, 200)
        );
        continue;
      }

      // Extract slot number from the [CARD slot="N" ...] attribute if present
      const slotMatch = block.match(/\[CARD[^\]]*\bslot="(\d+)"/i);
      const slot = slotMatch ? parseInt(slotMatch[1], 10) : null;
      validatedBlocks.push({ card_spec: block, line1: '', line2: '', slot });
    }

    if (validatedBlocks.length > 0) return validatedBlocks;

    // All blocks were rejected (split pairs) — fall through to Format 2
    // which reads plain-text Power says / Servant leadership says pairs
    // and handles them correctly
    console.warn(
      '[appendQuoteCardImages] All [CARD] blocks were rejected due to split Power/Servant pairs. Falling through to plain-text pair parser.'
    );
  }

  // Format 2: Power says / Servant leadership says pairs
  const pairRe = /Power\s+says:\s*([^\n]+)\s*\n\s*Servant\s+leadership\s+says:\s*([^\n]+)/gi;
  while ((m = pairRe.exec(s)) !== null) {
    cards.push({
      line1: `Power says: ${m[1].trim()}`,
      line2: `Servant leadership says: ${m[2].trim()}`,
    });
  }
  if (cards.length) return cards;

  // Format 3: Numbered "Servant leadership says: [statement]" lines
  const slRe = /^\s*\d+\.\s+Servant\s+leadership\s+says:\s*(.+)$/gim;
  while ((m = slRe.exec(s)) !== null) {
    cards.push({ line1: 'Servant leadership says:', line2: m[1].trim() });
  }
  if (cards.length) return cards;

  // Also match without leading number
  const slRe2 = /Servant\s+leadership\s+says:\s*([^\n]+)/gi;
  while ((m = slRe2.exec(s)) !== null) {
    cards.push({ line1: 'Servant leadership says:', line2: m[1].trim() });
  }
  if (cards.length) return cards;

  // Format 4: Numbered attributed quotes — "Quote text" — Author Name
  const quoteRe = /^\s*\d+\.\s+"([^"]+)"\s*[—–-]+\s*(.+)$/gim;
  while ((m = quoteRe.exec(s)) !== null) {
    cards.push({ line1: `"${m[1].trim()}"`, line2: `— ${m[2].trim()}` });
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
  ];
  return patterns.some((re) => re.test(u));
}

/** Re-render all card PNGs (e.g. after logo fix) — do not reuse prior URLs in thread. */
function userRequestedImageRegeneration(userMessage) {
  const u = String(userMessage || '').toLowerCase();
  if (!u.trim()) return false;
  return (
    /\b(regenerat|rebuild|refresh|redo)\b.{0,60}\b(images?|pngs?|cards?|all)\b/.test(u) ||
    /\b(images?|pngs?|cards?)\b.{0,30}\b(regenerat|rebuild|refresh|redo)\b/.test(u) ||
    /\b(regenerat|rebuild|refresh)\b.{0,30}\b(card|quote)\s*(images?|pngs?)?\b/.test(u) ||
    /\b(fix|update|redo)\b.{0,40}\b(logo|images?)\b/.test(u) ||
    /\b(proper|correct)\s+logo\b/.test(u) ||
    /\blogo\b.{0,20}\b(fixed|correct|proper)\b/.test(u) ||
    /\bregenerat\b.{0,20}\ball\b/.test(u) ||
    /\ball\b.{0,20}\b(fresh|new|again)\b.{0,30}\b(cards?|images?|pngs?)\b/.test(u) ||
    /\b(fresh|new)\b.{0,20}\b(cards?|images?|pngs?)\b/.test(u) ||
    /\bclear\b.{0,20}\b(cache|cached)\b/.test(u) ||
    /\bdo not reuse\b/.test(u) ||
    /\bnew\s+urls?\b/.test(u) ||
    /\bforce\b.{0,20}\b(new|fresh|regenerat)\b/.test(u)
  );
}

/** Detect if Bart or Auto has requested a light/white card theme. */
function detectCardTheme(userMessage, replyText) {
  const combined = `${String(userMessage || '')} ${String(replyText || '')}`.toLowerCase();
  if (
    /\bwhite\s+background\b/.test(combined) ||
    /\blight\s+(theme|card|version|background)\b/.test(combined) ||
    /\bblack\s+text\b/.test(combined) ||
    /\binvert(ed)?\s+(the\s+)?(card|color|theme)\b/.test(combined) ||
    /\bflip\s+(the\s+)?(color|theme|card)\b/.test(combined) ||
    /\blight\b.{0,30}\b(card|image|png)\b/.test(combined)
  ) {
    return 'light';
  }
  return 'dark';
}

async function generateAllPngs(cardSpecs, threadId, { forceNew = false, theme = 'dark' } = {}) {
  // Deduplicate: if images for this exact thread already exist in the
  // [IMAGES_GENERATED] block of any prior message, return those URLs.
  // Skipped when Bart asks to regenerate (logo fix, refresh entire set).
  if (forceNew) {
    console.log('[appendQuoteCardImages] forceNew=true — skipping cache, generating fresh');
  } else if (threadId) {
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
          // Use slot number if provided (global seed position), otherwise fall back to batch position
          const cardNumber = spec.slot != null ? spec.slot : i + 1;
          const img = await generateQuoteCardImage({
            line1: spec.line1,
            line2: spec.line2 || '',
            card_spec: spec.card_spec || '',
            card_index: cardNumber,
            theme,
          });
          return img.ok && img.image_url ? { card: cardNumber, image_url: img.image_url } : null;
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
  const rawReply = String(reply || '');
  if (!rawReply) return reply;

  // Do not fire the quote card renderer if this is a publish signal.
  // Check current reply AND recent prior assistant messages — when Bart says "go"
  // to confirm a publish, the [PUBLISH_JOURNAL] tag is in Auto's prior reply,
  // not the current one. Without checking prior messages, "go" matches
  // userRequestedImageGeneration and triggers the diagnostic note.
  const priorAssistantForPublish = Array.isArray(priorMessages)
    ? [...priorMessages].filter((m) => m.role === 'assistant').slice(-5)
    : [];
  const isPublishSignal =
    /\[PUBLISH_JOURNAL/i.test(String(rawReply || '')) ||
    /\[PUBLISH_DEVOTIONAL/i.test(String(rawReply || '')) ||
    priorAssistantForPublish.some(
      (m) =>
        /\[PUBLISH_JOURNAL/i.test(String(m.content || '')) ||
        /\[PUBLISH_DEVOTIONAL/i.test(String(m.content || ''))
    );
  if (isPublishSignal) return rawReply;

  // Do not fire the quote card renderer if this is a DALL-E design image thread.
  // Check: current reply, current user message, and the last 3 assistant messages.
  // When Bart says "go" to trigger DALL-E generation, the [DALLE_GENERATE] tag lives
  // in the prior assistant message — not in the current reply or user message.
  const priorAssistantMessages = Array.isArray(priorMessages)
    ? [...priorMessages].filter((m) => m.role === 'assistant').slice(-3)
    : [];
  const isDesignRequest =
    /\[DALLE_GENERATE/i.test(String(rawReply || '')) ||
    /\[DALLE_GENERATE/i.test(String(userMessage || '')) ||
    priorAssistantMessages.some((m) => /\[DALLE_GENERATE/i.test(String(m.content || '')));
  if (isDesignRequest) return rawReply;

  // Strip any [IMAGES_GENERATED] blocks Auto fabricated in its reply.
  // Real blocks are only ever appended by the server — never written by the model.
  // If the model wrote one, it is a lie and must be removed before Guard 1 runs.
  const r = rawReply.replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '').trim();

  // Guard 1: current reply already has images
  if (/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/.test(r)) return r;

  const forceRegen = userRequestedImageRegeneration(userMessage);
  const wantImages = userRequestedImageGeneration(userMessage) || forceRegen;
  const userApproved = /\b(approved?|looks good|go|confirm)\b/i.test(String(userMessage || ''));

  // Detect if the current reply contains [CARD] blocks.
  // If it does, this IS a generation request — the model has written new card specs
  // that need to be rendered. This takes priority over Guard 2, which would otherwise
  // block rendering because a previous [IMAGES_GENERATED] block exists in the thread.
  // This allows multi-batch card generation across separate responses in one thread.
  const replyHasCardBlocks = /\[CARD[\s\S]*?\[\/CARD\]/i.test(r);

  // Guard 2: images were already generated in this thread for this batch.
  // Skip unless user is explicitly asking for images again (wantImages) OR
  // the current reply contains new [CARD] blocks to render.
  // This prevents double-generation when Auto confirms images on the next turn,
  // but allows subsequent card batches in the same thread to render correctly.
  if (!wantImages && !replyHasCardBlocks) {
    const priorRows = Array.isArray(priorMessages) ? priorMessages : [];
    const alreadyGenerated = priorRows.some(
      (m) => m.role === 'assistant' && /\[IMAGES_GENERATED\]/.test(String(m.content || ''))
    );
    if (alreadyGenerated) return r;
  }

  const newReplyHasCaptionsArtifact = /\[ARTIFACT\s+type=["']captions["']/i.test(r);

  let cardSpecs = [];

  if (replyHasCardBlocks) {
    // Current reply contains [CARD] blocks — always render these first.
    // This handles multi-batch generation across separate responses in one thread.
    const cardsFromReply = extractCardsFromPlainTextPairs(r);
    cardSpecs = dedupeCardSpecs(cardsFromReply);
  } else if (wantImages) {
    // User explicitly asked for images — check current reply first, then scan prior messages
    const cardsFromReply = extractCardsFromPlainTextPairs(r);
    if (cardsFromReply.length > 0) {
      cardSpecs = dedupeCardSpecs(cardsFromReply);
    } else {
      cardSpecs = extractCardSpecsFromPriorMessages(priorMessages);
    }
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

  const cardTheme = detectCardTheme(userMessage, r);
  // Force regeneration when the current reply contains new [CARD] blocks.
  // Without this, the cache returns old images from prior renders in the same thread,
  // including images rendered before format corrections were applied.
  const shouldForceNew = forceRegen || replyHasCardBlocks;
  const imageResults = await generateAllPngs(cardSpecs, threadId, { forceNew: shouldForceNew, theme: cardTheme });
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
