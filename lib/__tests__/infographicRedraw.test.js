/**
 * @jest-environment node
 *
 * A remake lands on the same Queue card (Bart, 2026-11-17: "the new image
 * should replace the old"). Only a card still waiting for Bart can change.
 */
const mockState = { row: null, updates: [] };
function mockQuery() {
  const q = {
    filters: {},
    select() { return q; },
    eq(k, v) { q.filters[k] = v; return q; },
    update(patch) { q.patch = patch; return q; },
    maybeSingle: async () => {
      if (q.patch) {
        if (mockState.row && mockState.row.status === q.filters.status) {
          mockState.updates.push(q.patch);
          Object.assign(mockState.row, q.patch);
          return { data: { id: mockState.row.id, image_url: mockState.row.image_url, status: mockState.row.status }, error: null };
        }
        return { data: null, error: null };
      }
      return { data: mockState.row && { ...mockState.row }, error: null };
    },
  };
  return q;
}
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => mockQuery() } }));
jest.mock('../ao/quoteCardImageUrl.js', () => ({ uploadQuoteCardPngBuffer: async () => ({ ok: true, publicUrl: 'https://x.supabase.co/storage/v1/object/public/b/infographics/new.png' }) }));
jest.mock('../ao/infographicCanvas.js', () => ({ renderInfographicPng: async () => ({ ok: true, buffer: Buffer.alloc(200), spacing: { ok: true, issues: [] } }) }));
jest.mock('../ao/seedWeeklyCorpusPullBundle.js', () => ({}));
jest.mock('../ao/brandLogos.js', () => ({}));
jest.mock('../ao/remoteAssetDataUrl.js', () => ({}));

import { redrawInfographic } from '../ao/infographics.js';

beforeEach(() => {
  mockState.updates = [];
  mockState.row = { id: 'g1', status: 'pending', layout: 'grid', image_url: 'https://old.png', content: { layout: 'grid', title: 'T', spacing_check: { ok: false } }, source_title: 'T' };
});

test('a waiting card gets the new image on the same card, with the checks', async () => {
  const checkNotes = jest.fn(async () => ({ ok: true, pass: true, misses: [] }));
  const r = await redrawInfographic('g1', { checkNotes });
  expect(r.ok).toBe(true);
  expect(r.image_url).toMatch(/new\.png$/);
  expect(r.previous_image_url).toBe('https://old.png');
  expect(r.spacing).toEqual({ ok: true, issues: [] });
  expect(r.design_check.pass).toBe(true);
  expect(checkNotes.mock.calls[0][0].imageUrl).toMatch(/new\.png$/);
  expect(mockState.updates).toHaveLength(1);
  expect(mockState.updates[0].content.spacing_check).toEqual({ ok: true, issues: [] });
  expect(mockState.row.status).toBe('pending');
});

test('an approved or set-aside card keeps the image Bart saw', async () => {
  mockState.row.status = 'approved';
  const r = await redrawInfographic('g1');
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/approved/);
  expect(mockState.updates).toHaveLength(0);
});
