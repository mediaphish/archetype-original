/**
 * @jest-environment node
 *
 * Bart's promises ("I'll send you the piece about the room") matched to his
 * published writing (2026-10-24). Only live pages are offered, and Claude's
 * pick is held to the candidates it was shown.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/corpusChunks.js', () => ({
  searchCorpusChunks: jest.fn(),
  groupChunksByDocument: (hits) => hits,
}));

import { linkBartItems, linkableCandidates, pageFor } from '../calendly/writingLinks.js';

const live = new Map([
  ['the-room', { slug: 'the-room', type: 'book', status: 'final' }],
  ['accountability-comes-first', { slug: 'accountability-comes-first', type: 'journal-post', status: 'published' }],
]);

test('books and journal posts get their real pages; drafts and FAQs do not', () => {
  const docs = [
    { slug: 'the-room', doc_type: 'book', title: 'The Room' },
    { slug: 'accountability-comes-first', doc_type: 'journal-post', title: 'Accountability Comes First' },
    { slug: 'fundamentals-draft', doc_type: 'article', title: 'Draft' },
    { slug: 'some-faq', doc_type: 'faq', title: 'FAQ' },
  ];
  const out = linkableCandidates(docs, live);
  expect(out.map((c) => c.url)).toEqual([
    'https://www.archetypeoriginal.com/the-room',
    'https://www.archetypeoriginal.com/journal/accountability-comes-first',
  ]);
  expect(pageFor({ slug: 'x', type: 'journal-post' })).toBe('https://www.archetypeoriginal.com/journal/x');
});

test('a pick outside the candidates is dropped, and an item with no fit gets no link', async () => {
  const search = jest.fn(async (q) => (q.includes('room') ? [{ slug: 'the-room', doc_type: 'book', title: 'The Room' }] : []));
  const pick = jest.fn(async () => ({
    items: [
      { n: 1, picks: [{ slug: 'the-room', why: 'It is the piece he named.' }, { slug: 'made-up', why: 'x' }] },
      { n: 2, picks: [] },
    ],
  }));
  const out = await linkBartItems(['Send the piece about the room', 'Introduce him to Sam'], { search, pick, live });
  expect(out[0].links).toEqual([{ title: 'The Room', url: 'https://www.archetypeoriginal.com/the-room', why: 'It is the piece he named.' }]);
  expect(out[1].links).toEqual([]);
});

test('no items, no work', async () => {
  const search = jest.fn();
  expect(await linkBartItems([], { search, pick: jest.fn(), live })).toEqual([]);
  expect(search).not.toHaveBeenCalled();
});
