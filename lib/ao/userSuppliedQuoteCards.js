/**
 * Detect pasted quote lists (no corpus search) and parse into card rows
 * compatible with corpus_pull_quotes / publish_candidates shape.
 */

function wantsQuoteCardBuildIntent(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return false;
  const hasCardWord =
    /\b(cards?|quote[\s-]*cards?|branded|image\s+cards?|square\s+cards?|previews?)\b/.test(s);
  const hasBuild =
    /\b(generate|make|create|build|produce|give\s+me|show\s+me|draft)\b/.test(s);
  if (hasCardWord && hasBuild) return true;
  if (/\b(minimal|archetype)\b/.test(s) && hasBuild && /\b(quote|card)\b/.test(s)) return true;
  return false;
}

/**
 * @param {string} text
 * @returns {{ quote: string, source_title: string, url: string }[]}
 */
export function parseUserSuppliedQuoteCards(text) {
  const raw = String(text || '').split(/\r?\n/);
  const cards = [];
  let pair = [];

  const flushPair = () => {
    if (!pair.length) return;
    const quote = pair.join('\n').trim();
    if (quote) {
      cards.push({ quote, source_title: 'Provided in chat', url: '' });
    }
    pair = [];
  };

  for (let line of raw) {
    line = line.trim();
    if (!line) {
      continue;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered && !/says:\s*/i.test(line)) {
      flushPair();
      cards.push({ quote: numbered[2].trim(), source_title: 'Provided in chat', url: '' });
      continue;
    }

    if (/says:\s*/i.test(line)) {
      pair.push(line);
      if (pair.length >= 2) {
        flushPair();
      }
      continue;
    }
  }
  flushPair();
  return cards.slice(0, 12);
}

/**
 * User pasted their own quotes and asked for cards — not a corpus search.
 * Requires no word "corpus" (that path is handled separately).
 */
export function wantsUserSuppliedQuoteCards(text) {
  if (!text || /\bcorpus\b/i.test(String(text))) return false;
  const cards = parseUserSuppliedQuoteCards(text);
  if (!cards.length) return false;
  const multi = cards.length >= 2;
  const pairedBlock = cards.length === 1 && String(cards[0].quote).includes('\n');
  if (!multi && !pairedBlock) return false;
  return wantsQuoteCardBuildIntent(text);
}
