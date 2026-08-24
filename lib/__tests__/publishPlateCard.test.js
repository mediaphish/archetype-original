/**
 * @jest-environment node
 *
 * Plate rotation, tested without storage. The upload path needs credentials CI
 * does not have, but the selection logic is the part with real behaviour in it
 * and it is pure.
 */
// Imported from the pure module, not from publishPlateCard: that file pulls in
// supabase-admin at module scope, which throws on a missing SUPABASE_URL and
// took this whole suite down with it.
import { choosePlate } from '../ao/generatePlateCard.js';

const PLATES = ['variation_01.jpg', 'variation_03.jpg', 'variation_04.jpg', 'variation_05.jpg'];

describe('choosePlate', () => {
  it('never returns a recently used plate while fresh ones remain', () => {
    const recent = ['variation_01', 'variation_03'];
    for (let i = 0; i < 50; i++) {
      expect(recent).not.toContain(choosePlate(PLATES, recent).replace(/\.[^.]+$/, ''));
    }
  });

  it('matches recency on the basename, not the filename', () => {
    // History is recorded as 'variation_01'; the library moved from PNG to JPEG
    // once already. Comparing whole filenames would silently stop excluding
    // anything the next time an extension changes.
    const picks = new Set();
    for (let i = 0; i < 50; i++) picks.add(choosePlate(PLATES, ['variation_01']));
    expect(picks.has('variation_01.jpg')).toBe(false);
  });

  it('alternates when only two plates exist', () => {
    const two = ['a.jpg', 'b.jpg'];
    expect(choosePlate(two, ['a'])).toBe('b.jpg');
    expect(choosePlate(two, ['b'])).toBe('a.jpg');
  });

  it('still returns a plate when every plate was used recently', () => {
    // Repeating a plate is a blemish. Returning nothing is a defect: it would
    // block a post over a cosmetic preference.
    const all = PLATES.map((p) => p.replace(/\.[^.]+$/, ''));
    expect(PLATES).toContain(choosePlate(PLATES, all));
  });

  it('returns null only when there are no plates at all', () => {
    expect(choosePlate([], [])).toBeNull();
  });

  it('spreads across the library rather than favouring one plate', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(choosePlate(PLATES, []));
    expect(seen.size).toBe(PLATES.length);
  });
});
