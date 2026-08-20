import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { chunkText, CHUNK_DEFAULTS } from '../ao/chunkText.js';

/** Word sequence, whitespace-insensitive — chunking may normalize spacing but must not drop words. */
function words(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean);
}

describe('chunkText', () => {
  describe('basic behavior', () => {
    it('returns an empty array for empty input', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText(null)).toEqual([]);
      expect(chunkText(undefined)).toEqual([]);
      expect(chunkText('   \n\n  ')).toEqual([]);
    });

    it('returns a single chunk for text shorter than the limit', () => {
      const text = 'A short paragraph that easily fits.';
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].index).toBe(0);
    });

    it('numbers chunks sequentially from zero', () => {
      const text = Array.from({ length: 40 }, (_, i) => `Paragraph number ${i} ${'filler '.repeat(20)}`).join('\n\n');
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk, i) => expect(chunk.index).toBe(i));
    });
  });

  describe('the no-loss guarantee', () => {
    // This is the test that exists because the old approach silently truncated
    // every document at 3000 characters. Chunking must never drop text.
    it('preserves every word, in order, when overlap is disabled', () => {
      const text = Array.from(
        { length: 50 },
        (_, i) => `Paragraph ${i}. ${'The quick brown fox jumps over the lazy dog. '.repeat(6)}`
      ).join('\n\n');

      const chunks = chunkText(text, { overlapChars: 0 });
      expect(chunks.length).toBeGreaterThan(5);

      const rebuilt = chunks.flatMap((chunk) => words(chunk.content));
      expect(rebuilt).toEqual(words(text));
    });

    it('preserves every word when a paragraph has no blank-line breaks', () => {
      const text = `${'This is one very long unbroken paragraph with many sentences. '.repeat(120)}`;
      const chunks = chunkText(text, { overlapChars: 0 });
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.flatMap((c) => words(c.content))).toEqual(words(text));
    });

    it('preserves every word when the text has no sentence punctuation at all', () => {
      const text = 'word '.repeat(3000).trim();
      const chunks = chunkText(text, { overlapChars: 0 });
      expect(chunks.flatMap((c) => words(c.content))).toEqual(words(text));
    });
  });

  describe('size limits', () => {
    it('keeps chunks within maxChars, allowing for overlap and a folded tail', () => {
      const maxChars = 800;
      const overlapChars = 100;
      const text = Array.from({ length: 60 }, (_, i) => `Section ${i}. ${'content '.repeat(30)}`).join('\n\n');

      const chunks = chunkText(text, { maxChars, overlapChars });
      // A chunk carries at most maxChars of its own text, plus the overlap
      // prefix, plus a folded short tail (capped at 1.5x in chunkText).
      const ceiling = maxChars * 1.5 + overlapChars + 2;
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(ceiling);
      }
    });

    it('splits a single word longer than maxChars instead of looping forever', () => {
      const giant = 'x'.repeat(5000);
      const chunks = chunkText(giant, { maxChars: 500, overlapChars: 0 });
      expect(chunks.length).toBe(10);
      expect(chunks.map((c) => c.content).join('')).toBe(giant);
    });
  });

  describe('overlap', () => {
    it('prefixes each chunk after the first with text from the previous chunk', () => {
      const text = Array.from({ length: 30 }, (_, i) => `Para ${i}. ${'filler words here. '.repeat(15)}`).join('\n\n');
      const withOverlap = chunkText(text, { maxChars: 900, overlapChars: 150 });
      const withoutOverlap = chunkText(text, { maxChars: 900, overlapChars: 0 });

      expect(withOverlap.length).toBe(withoutOverlap.length);
      expect(withOverlap[0].content).toBe(withoutOverlap[0].content);

      for (let i = 1; i < withOverlap.length; i++) {
        expect(withOverlap[i].content.length).toBeGreaterThan(withoutOverlap[i].content.length);
        expect(withOverlap[i].content.endsWith(withoutOverlap[i].content)).toBe(true);
      }
    });

    it('never starts an overlap prefix mid-word', () => {
      const text = Array.from({ length: 20 }, (_, i) => `Para ${i}. ${'alpha bravo charlie delta. '.repeat(12)}`).join('\n\n');
      const chunks = chunkText(text, { maxChars: 700, overlapChars: 120 });

      const vocabulary = new Set(words(text).map((w) => w.replace(/[.,]/g, '')));
      for (let i = 1; i < chunks.length; i++) {
        const firstWord = words(chunks[i].content)[0].replace(/[.,]/g, '');
        expect(vocabulary.has(firstWord)).toBe(true);
      }
    });
  });

  describe('against the real corpus', () => {
    const knowledgePath = join(process.cwd(), 'public', 'knowledge.json');
    const hasCorpus = existsSync(knowledgePath);
    const maybe = hasCorpus ? describe : describe.skip;

    maybe('public/knowledge.json', () => {
      let docs = [];
      beforeAll(() => {
        docs = JSON.parse(readFileSync(knowledgePath, 'utf8')).docs || [];
      });

      it('loses no words from any document in the corpus', () => {
        const lossy = [];
        for (const doc of docs) {
          const body = doc.body || '';
          if (!body.trim()) continue;
          const chunks = chunkText(body, { overlapChars: 0 });
          const rebuilt = chunks.flatMap((c) => words(c.content));
          if (rebuilt.length !== words(body).length) {
            lossy.push({ slug: doc.slug, expected: words(body).length, got: rebuilt.length });
          }
        }
        expect(lossy).toEqual([]);
      });

      it('produces chunks for every non-empty document', () => {
        const empty = docs
          .filter((doc) => (doc.body || '').trim())
          .filter((doc) => chunkText(doc.body).length === 0)
          .map((doc) => doc.slug);
        expect(empty).toEqual([]);
      });

      it('uses defaults that keep the chunk count reasonable', () => {
        const total = docs.reduce((sum, doc) => sum + chunkText(doc.body || '').length, 0);
        expect(CHUNK_DEFAULTS.maxChars).toBe(1500);
        // Sanity bound: a blow-up here means the chunker regressed, not that
        // the corpus grew — the corpus is ~1.9M chars.
        expect(total).toBeGreaterThan(docs.length);
        expect(total).toBeLessThan(20000);
      });
    });
  });
});
