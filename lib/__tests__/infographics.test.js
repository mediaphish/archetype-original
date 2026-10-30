/**
 * @jest-environment node
 *
 * Infographic posts (2026-10-24): words from one of Bart's pieces, held to
 * each layout's limits, approved by Bart, posted Tuesday to Thursday.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/quoteCardImageUrl.js', () => ({}));
jest.mock('../ao/seedWeeklyCorpusPullBundle.js', () => ({}));
jest.mock('../ao/brandLogos.js', () => ({}));
jest.mock('../ao/remoteAssetDataUrl.js', () => ({}));
jest.mock('../ao/infographicCanvas.js', () => ({}));

import { normalizeGraphic, checkGraphic, titleCountMismatch, eligibleSources, writeInfographic } from '../ao/infographicContent.js';
import { nextSlot, nextLayout, postText } from '../ao/infographics.js';

test('a framework needs three or four named ideas with two moves each; nothing is ever cut', () => {
  const g = normalizeGraphic({ title: 'Four places authority is earned', items: [{ name: 'A' }, { name: 'B', moves: ['x', 'y', 'z'] }, { name: 'C' }] }, 'framework');
  expect(g.items).toHaveLength(3);
  expect(g.items[1].moves).toEqual(['x', 'y']);
  expect(normalizeGraphic({ title: 'x', items: [{ name: 'A' }] }, 'framework')).toBeNull();
  // Over the limit is refused so the writer shortens it, never chopped mid-word.
  const long = checkGraphic({ title: 't', items: [{ name: 'C'.repeat(80) }, { name: 'B' }, { name: 'D' }] }, 'framework');
  expect(long.tooLong[0]).toMatch(/item 1 name \(80 characters, limit 40\)/);
  expect(normalizeGraphic({ title: 't', items: [{ name: 'C'.repeat(80) }, { name: 'B' }, { name: 'D' }] }, 'framework')).toBeNull();
});

test('an over-long line goes back to the writer with what to shorten', async () => {
  const tooLong = { graphic: { title: 'T', rows: [1, 2, 3].map(() => ({ myth: 'm', truth: 'x'.repeat(200) })) }, caption: 'c', caption_x: 'x' };
  const fine = { graphic: { title: 'T', rows: [1, 2, 3].map(() => ({ myth: 'm', truth: 'Short and true.' })) }, caption: 'c', caption_x: 'x' };
  const complete = jest.fn().mockResolvedValueOnce(tooLong).mockResolvedValueOnce(fine);
  const r = await writeInfographic({ slug: 's', title: 'S', body: 'b' }, 'myths', { complete, judge: async () => [] });
  expect(r.ok).toBe(true);
  expect(complete.mock.calls[1][0].prompt).toMatch(/over their limits/);
});

test('paths need both labels and four rows; myths need three', () => {
  const rows = [1, 2, 3, 4].map((i) => ({ left: `l${i}`, right: `r${i}` }));
  expect(normalizeGraphic({ title: 't', left_label: 'Power says', right_label: 'Servant leadership says', rows }, 'paths').rows).toHaveLength(4);
  expect(normalizeGraphic({ title: 't', rows }, 'paths')).toBeNull();
  expect(normalizeGraphic({ title: 't', rows: [{ myth: 'm', truth: 't' }] }, 'myths')).toBeNull();
});

test('only published journal entries and book chapters with a page, not used before', () => {
  const body = 'x'.repeat(2000);
  const docs = [
    { slug: 'a', type: 'journal-post', status: 'published', body },
    { slug: 'b', type: 'journal-post', status: 'draft', body },
    { slug: 'c', type: 'devotional', status: 'published', body },
    { slug: 'd', type: 'chapter', status: 'final', tags: ['accidental-ceo'], body },
    { slug: 'e', type: 'journal-post', status: 'published', body, publish_date: '2099-01-01' },
  ];
  expect(eligibleSources(docs, new Set(['zz'])).map((d) => d.slug)).toEqual(['a', 'd']);
  expect(eligibleSources(docs, new Set(['a'])).map((d) => d.slug)).toEqual(['d']);
});

test('slots are Tuesday and Thursday at 12:30 Central, one a day', () => {
  const sat = new Date('2026-10-24T15:00:00Z');
  const first = nextSlot(sat);
  expect(first.toISOString()).toBe('2026-10-27T17:30:00.000Z');
  expect(nextSlot(sat, [first]).toISOString()).toBe('2026-10-29T17:30:00.000Z');
  expect(nextSlot(sat, ['2026-10-27T17:30:00Z', '2026-10-29T17:30:00Z']).toISOString()).toBe('2026-11-03T17:30:00.000Z');
});

test('the least used layout comes next', () => {
  expect(nextLayout([{ layout: 'framework' }, { layout: 'paths' }])).toBe('myths');
});

test('posts carry the source; X keeps the link whole', () => {
  const row = { caption: 'Body.', caption_x: 'Short.', source_title: 'Accountability Comes First', source_url: 'https://www.archetypeoriginal.com/journal/accountability-comes-first' };
  expect(postText(row, 'linkedin')).toBe('Body.\n\nFrom "Accountability Comes First" · https://www.archetypeoriginal.com/journal/accountability-comes-first');
  expect(postText(row, 'twitter').endsWith(row.source_url)).toBe(true);
  // Instagram links are dead in captions: it says link in bio, never the raw address (2026-10-26).
  expect(postText(row, 'instagram')).toBe('Body.\n\nFrom "Accountability Comes First" · link in bio');
});

test('a draft with banned phrasing is sent back once, then refused', async () => {
  const bad = { graphic: { title: 'T', rows: [1, 2, 3].map(() => ({ myth: 'm', truth: 'Something to sit with' })) }, caption: 'c', caption_x: 'x' };
  const complete = jest.fn(async () => bad);
  const r = await writeInfographic({ slug: 's', title: 'S', body: 'b' }, 'myths', { complete, judge: async () => [] });
  expect(r.ok).toBe(false);
  expect(complete).toHaveBeenCalledTimes(3);
  expect(complete.mock.calls[1][0].prompt).toMatch(/banned phrasing/);
});

test('a count in the title has to match the graphic', () => {
  const items = [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }];
  expect(titleCountMismatch({ title: 'Three things servant leadership actually is', items })).toMatch(/says three but the graphic has 4/);
  expect(titleCountMismatch({ title: 'Four places authority is earned', items })).toBeNull();
  expect(titleCountMismatch({ title: 'Words are cheap', rows: [1, 2] })).toBeNull();
});

test('the four designs from 2026-10-25 hold to their shapes', () => {
  const two = (n) => Array.from({ length: n }, (_, i) => ({ name: `N${i}`, line: `L${i}` }));
  expect(normalizeGraphic({ title: 't', items: two(5) }, 'stages').items).toHaveLength(5);
  expect(normalizeGraphic({ title: 't', items: two(3) }, 'stages')).toBeNull();
  expect(normalizeGraphic({ title: 't', items: two(8) }, 'pillars').items).toHaveLength(8);
  expect(normalizeGraphic({ title: 't', items: two(7) }, 'pillars')).toBeNull();
  const lessons = Array.from({ length: 4 }, (_, i) => ({ name: `Lesson ${i}`, points: ['a', 'b', 'c'] }));
  expect(normalizeGraphic({ title: 't', items: lessons }, 'lessons').items[0].points).toEqual(['a', 'b']);
  const rows = [1, 2, 3].map(() => ['a', 'b', 'c']);
  expect(normalizeGraphic({ title: 't', columns: ['x', 'y', 'z'], rows }, 'grid').rows).toHaveLength(3);
  expect(normalizeGraphic({ title: 't', columns: ['x', 'y'], rows }, 'grid')).toBeNull();
  expect(titleCountMismatch({ title: 'Five things', items: lessons })).toMatch(/has 4/);
});

test('a pyramid can hold seven steps and a short this-week list', () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ name: `N${i}`, line: `L${i}` }));
  const g = normalizeGraphic({ title: 'Seven steps', items, this_week: ['a', 'b', 'c', 'd'] }, 'stages');
  expect(g.items).toHaveLength(7);
  expect(g.this_week).toEqual(['a', 'b', 'c']);
  expect(titleCountMismatch(g)).toBeNull();
});

describe('hard rule: nothing borrowed from the examples Bart shared (2026-10-25)', () => {
  const { borrowedLines } = jest.requireActual('../ao/infographicOriginality.js');
  test('a line or heading lifted from an example is caught', () => {
    expect(borrowedLines({ graphic: { items: [{ name: 'Honor your team’s time', line: 'Every pointless meeting erodes the team’s faith in your leadership.' }] } })).toHaveLength(2);
    expect(borrowedLines({ graphic: { items: [{ name: 'Be dependable', line: 'x' }] } })).toEqual(['Be dependable']);
    expect(borrowedLines({ graphic: { title: 'Authority is earned in stages' }, caption: 'People can predict how you will show up.' })).toEqual([]);
  });
  test('wording that is in Bart’s own piece is his', () => {
    expect(borrowedLines({ graphic: { items: [{ name: 'Be dependable' }] }, source: 'Above all, be dependable.' })).toEqual([]);
  });
  test('borrowed wording goes back to the writer, and a reworded line found by the reader does too', async () => {
    const rows = (t) => [1, 2, 3].map(() => ({ myth: 'm', truth: t }));
    const lifted = { graphic: { title: 'T', rows: rows('Micromanagement stifles development and drives away talent.') }, caption: 'c', caption_x: 'x' };
    const clean = { graphic: { title: 'T', rows: rows('Short and true.') }, caption: 'c', caption_x: 'x' };
    const complete = jest.fn().mockResolvedValueOnce(lifted).mockResolvedValueOnce(clean).mockResolvedValueOnce(clean);
    const judge = jest.fn().mockResolvedValueOnce(['Short and true.']).mockResolvedValueOnce([]);
    const r = await writeInfographic({ slug: 's', title: 'S', body: 'b' }, 'myths', { complete, judge });
    expect(r.ok).toBe(true);
    expect(complete).toHaveBeenCalledTimes(3);
    expect(complete.mock.calls[1][0].prompt).toMatch(/too close to someone else's published infographic/);
    expect(complete.mock.calls[2][0].prompt).toMatch(/follow someone else's published infographic too closely/);
    // The writer is told which of its own lines to change, never the examples' words.
    expect(complete.mock.calls[2][0].prompt).not.toMatch(/MRTS|pointless meeting/);
  });
  test('the writer never sees the examples', () => {
    const { contentPrompt } = jest.requireActual('../ao/infographicContent.js');
    const p = contentPrompt({ title: 'T', body: 'b' }, 'stages');
    expect(p).not.toMatch(/MRTS|Luminary|pointless meeting/);
    expect(p).toMatch(/Never reuse wording, headings, lists or frameworks from anyone else's infographic/);
  });
});

test('quote card captions say link in bio on Instagram, never a dead link (2026-10-26)', async () => {
  const { buildCaptionForCardPost } = jest.requireActual('../ao/scheduleWeeklyBundle.js');
  const item = { caption: 'Body.', source_title: 'Do the Work', url: 'https://www.archetypeoriginal.com/accidental-ceo' };
  expect(buildCaptionForCardPost(item, 'instagram')).toBe('Body.\n\nDo the Work · link in bio');
  expect(buildCaptionForCardPost(item, 'facebook')).toBe('Body.\n\nDo the Work · https://www.archetypeoriginal.com/accidental-ceo');
});
