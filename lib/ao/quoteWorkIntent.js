/**
 * Shared detection for in-thread quote-card work — used so Recall mode does not
 * block routing (detectAutoMode + chat handler). Kept in sync with api/ao/auto/chat.js intent.
 */

import { wantsUserSuppliedQuoteCards } from './userSuppliedQuoteCards.js';

function wantsCorpusPullQuotes(text) {
  const raw = String(text || '').trim();
  if (!raw || !/\bcorpus\b/i.test(raw)) return false;

  const s = raw.toLowerCase();
  const quoteHint =
    /\b(pull[- ]?quotes?|quote\s+cards?|weekly\s+pull\s+quotes?|weekly\s+quotes?|candidate\s+quotes?|lines?\s+to\s+(?:quote|post))\b/.test(
      s
    ) || /\bweekly\b.{0,80}\bpull\b.{0,40}\bquotes?\b/.test(s);

  const actionHint =
    /\b(find|pull|suggest|give me|show me|list|search|look (?:at|in|through)|pick|select|generate|creating|create|build|need to (?:generate|create|pull|get))\b/.test(
      s
    );

  if (/\bquotes? from (?:my |the |our )?corpus\b/.test(s)) return quoteHint || actionHint;
  if (/\bsearch (?:the )?corpus for\b/i.test(raw)) return true;
  if (quoteHint && actionHint) return true;
  if (quoteHint && /\b(from|in|about|on|for)\s+(?:my|the|our)\s+corpus\b/.test(s)) return true;
  if (/\b(build|grow|add to|expand)\s+(?:the |my |our )?corpus\b/.test(s) && (quoteHint || /\b(pull|quote|card|lines?)\b/.test(s)))
    return true;

  return false;
}

/** Inspect/show card text — includes multi-digit card counts (e.g. “20 cards”). */
function wantsQuoteCardInspect(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  if (/\b\d+\s+more\s+(?:quote\s+)?cards?\s+about\b/.test(s)) return false;
  if (
    /\b(generate|create|make|build)\s+(?:me\s+)?(?:\d+\s+)?(?:new\s+)?(?:more\s+)?(?:quote\s+)?cards?\b/.test(s) &&
    !/\b(show|see|text|what|which|read)\b/.test(s)
  ) {
    return false;
  }

  const hasCardRef = /\b(card|cards|quote|quotes)\b/.test(s);
  if (!hasCardRef) return false;

  if (/\b(cards?|quotes?)\b/.test(s) && /\b(text|give|for|review|last time)\b/.test(s) && /\b\d+\b/.test(s)) return true;

  const inspectIntent =
    /\b(show|see|display|preview|pull up|what(?:'s| is)|what are|text|words|copy|lines?|tell me|give me|need to see|look at|read (?:back|out|me))\b/.test(
      s
    ) || /\b(which|what)\b.*\b(card|quote)\b/.test(s);
  const shortCardIndex = /\b(card|quote)\s*#?\s*(\d{1,3})\b/.test(s) && s.length < 160;

  if (!inspectIntent && !shortCardIndex) return false;

  if (
    wantsCorpusPullQuotes(userMessage) &&
    /\b(find|pull|search|suggest|give me lines)\b/.test(s) &&
    /\b(from|in)\s+(?:my\s+)?corpus\b/.test(s) &&
    !inspectIntent
  ) {
    return false;
  }

  return (
    /\b(\d{1,3})\b/.test(s) ||
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/.test(s) ||
    shortCardIndex
  );
}

function wantsQuoteCardInventory(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  if (wantsQuoteCardInspect(userMessage)) return false;
  return (
    /\b(where (?:did|are)|what happened to|lost|missing|disappear)\b.*\b(card|quote|line|lines)\b/.test(s) ||
    /\b(how many|full list|list all|inventory|every quote|all candidates|all cards|all lines)\b/.test(s) ||
    /\bwhere\b.*\b(my|the)\b.*\b(card|quote|quotes|lines)\b/.test(s) ||
    /\b(show|give)\s+me\s+(?:a\s+)?(?:full\s+)?(?:list|inventory)\b/.test(s) ||
    /\blist\s+(?:the\s+)?\d+\s+(cards?|quotes?|lines?)\b/.test(s)
  );
}

/** Text-only signal for deliverables-style messages (corpus_pull_quotes may be filled in chat). */
function wantsDeliverablesStyleMessage(userMessage) {
  const s0 = String(userMessage || '').trim();
  const s = s0.toLowerCase();
  const picking = /\b[1-9]\d*\b/.test(s0) || /\ball\b/i.test(userMessage);
  if (wantsCorpusPullQuotes(userMessage) && !picking) return false;
  const hasDigit = /\b\d+\b/.test(s);
  const cardish = /\b(cards?|quotes?|captions?|pull[- ]?quotes?)\b/i.test(s);
  const deliver =
    /\b(captions?|cards?|image cards?|branded|instagram|produce|generat|go ahead|get to work|make the|make them|selected|now|draft|minimal|square|fix|correct|repair|update|redo|rebuild|regenerat|refresh|logo|show|see|display|preview|read|pull up|text for)\b/.test(
      s
    );
  return hasDigit && deliver && cardish;
}

/**
 * True when the message is about in-thread quote cards / corpus pull / paste batch,
 * so Auto should not stay stuck in Recall for this turn.
 */
export function messageIsInThreadQuoteWork(text) {
  if (!text || !String(text).trim()) return false;
  if (wantsUserSuppliedQuoteCards(text)) return true;
  if (wantsCorpusPullQuotes(text)) return true;
  if (wantsQuoteCardInventory(text)) return true;
  if (wantsQuoteCardInspect(text)) return true;
  if (wantsDeliverablesStyleMessage(text)) return true;
  return false;
}
