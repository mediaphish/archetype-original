/**
 * Pure text chunker for corpus documents.
 *
 * Splits a document body into overlapping passages small enough to embed
 * individually and to return whole at query time.
 *
 * This exists because the previous approach stored one row per document with
 * body_preview capped at 3000 chars (lib/ao/corpusEmbeddings.js). Retrieval
 * could find any document, but only ever handed back its opening — roughly
 * half the corpus by volume was findable and unreadable.
 *
 * No network, no database, no dependencies: chunking is a pure function so it
 * can be tested exhaustively. The guarantee this module makes, and that
 * lib/__tests__/chunkText.test.js enforces, is that chunking never drops text.
 */

const DEFAULT_MAX_CHARS = 1500;
const DEFAULT_OVERLAP_CHARS = 200;
const DEFAULT_MIN_CHARS = 250;

const TERMINATORS = '.!?';
const CLOSERS = '"\'”’»)]';

/**
 * Split on sentence-ending punctuation.
 *
 * A terminator only ends a sentence when whitespace (or end of text) follows
 * it, after any closing quotes or brackets. That keeps `Draft.docx`, `5.1.`,
 * `thing?),` and `nice.”` intact — splitting inside a token would corrupt the
 * text, which the corpus no-loss test enforces.
 */
function splitIntoSentences(text) {
  const sentences = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (!TERMINATORS.includes(text[i])) continue;

    // Absorb a run of terminators ("?!") and any closing punctuation after it.
    let end = i;
    while (end + 1 < text.length && TERMINATORS.includes(text[end + 1])) end++;
    let after = end + 1;
    while (after < text.length && CLOSERS.includes(text[after])) after++;

    // Mid-token punctuation is not a boundary.
    if (after < text.length && !/\s/.test(text[after])) {
      i = end;
      continue;
    }

    const sentence = text.slice(start, after).trim();
    if (sentence) sentences.push(sentence);
    start = after;
    i = after - 1;
  }

  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/** Hard-split a run of text with no usable break, on word boundaries. */
function splitOnWords(text, maxChars) {
  const out = [];
  const words = text.split(/\s+/).filter(Boolean);
  let current = '';

  for (const word of words) {
    // A single word longer than maxChars (a URL, say) gets sliced rather than
    // looping forever.
    if (word.length > maxChars) {
      if (current) {
        out.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        out.push(word.slice(i, i + maxChars));
      }
      continue;
    }
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      out.push(current);
      current = word;
    }
  }

  if (current) out.push(current);
  return out;
}

/** Break a paragraph that exceeds maxChars into sentence-packed units. */
function splitLongParagraph(paragraph, maxChars) {
  const sentences = splitIntoSentences(paragraph);
  const units = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        units.push(current);
        current = '';
      }
      units.push(...splitOnWords(sentence, maxChars));
      continue;
    }
    if (!current) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxChars) {
      current += ` ${sentence}`;
    } else {
      units.push(current);
      current = sentence;
    }
  }

  if (current) units.push(current);
  return units;
}

/**
 * Split document text into overlapping chunks.
 *
 * Paragraph boundaries are preferred; a paragraph too long to stand alone is
 * split on sentences, and a sentence too long is split on words. Each chunk
 * after the first is prefixed with the tail of the one before it so a passage
 * that straddles a boundary still reads coherently.
 *
 * @param {string} text
 * @param {{maxChars?: number, overlapChars?: number, minChars?: number}} [options]
 * @returns {Array<{ index: number, content: string }>} Empty array for empty input.
 */
export function chunkText(text, options = {}) {
  const maxChars = Math.max(100, Number(options.maxChars) || DEFAULT_MAX_CHARS);
  const overlapChars = Math.max(0, Math.min(Number(options.overlapChars ?? DEFAULT_OVERLAP_CHARS), Math.floor(maxChars / 2)));
  const minChars = Math.max(0, Number(options.minChars ?? DEFAULT_MIN_CHARS));

  const source = String(text || '').trim();
  if (!source) return [];

  const paragraphs = source
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // Break anything oversized down to units that individually fit.
  const units = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) units.push(paragraph);
    else units.push(...splitLongParagraph(paragraph, maxChars));
  }

  // Greedily pack units up to maxChars.
  const packed = [];
  let current = '';
  for (const unit of units) {
    if (!current) {
      current = unit;
    } else if (current.length + 2 + unit.length <= maxChars) {
      current += `\n\n${unit}`;
    } else {
      packed.push(current);
      current = unit;
    }
  }
  if (current) packed.push(current);

  // A short tail chunk carries little meaning on its own — fold it back if the
  // result stays within half again of maxChars.
  if (packed.length > 1 && packed[packed.length - 1].length < minChars) {
    const tail = packed[packed.length - 1];
    const previous = packed[packed.length - 2];
    if (previous.length + 2 + tail.length <= maxChars * 1.5) {
      packed.splice(packed.length - 2, 2, `${previous}\n\n${tail}`);
    }
  }

  if (overlapChars === 0) {
    return packed.map((content, index) => ({ index, content }));
  }

  return packed.map((content, index) => {
    if (index === 0) return { index, content };

    let tail = packed[index - 1].slice(-overlapChars);
    // Snap to a word boundary so the overlap does not begin mid-word.
    const firstSpace = tail.search(/\s/);
    if (firstSpace > -1) tail = tail.slice(firstSpace + 1);
    tail = tail.trim();

    return { index, content: tail ? `${tail}\n\n${content}` : content };
  });
}

export const CHUNK_DEFAULTS = {
  maxChars: DEFAULT_MAX_CHARS,
  overlapChars: DEFAULT_OVERLAP_CHARS,
  minChars: DEFAULT_MIN_CHARS,
};
