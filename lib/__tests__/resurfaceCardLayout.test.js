/**
 * @jest-environment node
 *
 * Where the quote sits on a photo of Bart.
 *
 * 2026-09-20: the image model lettered the resurface graphic and put the quote
 * across his face. The zone is now measured: detail loses, calm wins.
 */
import { chooseTextZone, scoreZone, fitQuoteLines, CANDIDATE_ZONES } from '../ao/resurfaceCardLayout.js';

const COLS = 12;
const ROWS = 9;

/** Tiles where `busy(col,row)` is true carry detail, the rest are calm shadow. */
function grid(busy) {
  const tiles = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const isBusy = busy(col, row);
      tiles.push({ col, row, mean: isBusy ? 150 : 40, stdev: isBusy ? 70 : 6 });
    }
  }
  return tiles;
}

describe('chooseTextZone', () => {
  it('keeps the quote off a subject standing on the right', () => {
    const zone = chooseTextZone({ tiles: grid((col) => col >= 7), cols: COLS, rows: ROWS });
    expect(['left', 'top-left', 'bottom-left']).toContain(zone.id);
  });

  it('keeps it off a subject on the left', () => {
    const zone = chooseTextZone({ tiles: grid((col) => col <= 4), cols: COLS, rows: ROWS });
    expect(['right', 'top-right', 'bottom-right']).toContain(zone.id);
  });

  it('drops to the quiet floor when the subject fills the upper frame', () => {
    const zone = chooseTextZone({ tiles: grid((_c, row) => row <= 5), cols: COLS, rows: ROWS });
    expect(['bottom', 'bottom-left', 'bottom-right']).toContain(zone.id);
  });

  it('falls back to a usable zone with no measurements', () => {
    const zone = chooseTextZone({ tiles: [], cols: COLS, rows: ROWS });
    expect(CANDIDATE_ZONES.map((z) => z.id)).toContain(zone.id);
    expect(zone.measured).toBe(false);
  });

  it('prefers the calm side even when both sides are dark', () => {
    const tiles = grid(() => false).map((t) => (t.col >= 7 ? { ...t, stdev: 65 } : t));
    expect(chooseTextZone({ tiles, cols: COLS, rows: ROWS }).id).toMatch(/left/);
  });
});

describe('scoreZone', () => {
  it('scores a calm zone better than a busy one', () => {
    const tiles = grid((col) => col >= 7);
    const left = scoreZone(CANDIDATE_ZONES.find((z) => z.id === 'left'), tiles, COLS, ROWS);
    const right = scoreZone(CANDIDATE_ZONES.find((z) => z.id === 'right'), tiles, COLS, ROWS);
    expect(left).toBeLessThan(right);
  });
});

describe('fitQuoteLines', () => {
  // Roughly Bebas at this size: half the font size per character.
  const measure = (line, size) => line.length * size * 0.5;

  it('wraps to fit the zone and stays inside its height', () => {
    const { lines, fontSize, lineHeight } = fitQuoteLines({
      quote: 'An org chart that only works when nothing is asking anything hard of it was never authority in the first place.',
      zoneWidth: 700,
      zoneHeight: 400,
      measure,
    });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.length * lineHeight).toBeLessThanOrEqual(400);
    expect(lines.every((l) => measure(l, fontSize) <= 700)).toBe(true);
    expect(lines.join(' ')).toContain('never authority in the first place.');
  });

  it('sets a short quote larger than a long one', () => {
    const short = fitQuoteLines({ quote: 'The test arrives on its own schedule.', zoneWidth: 700, zoneHeight: 400, measure });
    const long = fitQuoteLines({
      quote: 'An org chart that only works when nothing is asking anything hard of it was never authority in the first place, and the test does not wait.',
      zoneWidth: 700,
      zoneHeight: 400,
      measure,
    });
    expect(short.fontSize).toBeGreaterThan(long.fontSize);
  });

  it('returns nothing for an empty quote', () => {
    expect(fitQuoteLines({ quote: '   ', zoneWidth: 700, zoneHeight: 400, measure }).lines).toEqual([]);
  });
});
