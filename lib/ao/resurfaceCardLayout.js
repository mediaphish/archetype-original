/**
 * Where the pull quote can sit on a real photograph of Bart.
 *
 * 2026-09-20: the resurface path handed the quote to the image model inside the
 * prompt, so the model lettered it, and it ran straight across Bart's face.
 * "You have just never gotten one right." The quote-card pipeline already had
 * the answer in its own comments: the image model paints and never letters, the
 * canvas sets every glyph. This brings the same rule to real photos.
 *
 * The zone is measured, not guessed, so a photo added later needs no setup. The
 * photo is divided into tiles; each carries mean brightness and standard
 * deviation. A face, a figure or a globe is detail, so its tiles have a high
 * deviation and lose. Empty wall, floor and shadow win.
 *
 * Pure. Takes tile statistics, returns a rectangle in 0..1 coordinates.
 */

/** Candidate rectangles, in fractions of the frame. Order is a tie-break preference. */
export const CANDIDATE_ZONES = Object.freeze([
  { id: 'right', x: 0.52, y: 0.08, w: 0.42, h: 0.84, align: 'left' },
  { id: 'left', x: 0.06, y: 0.08, w: 0.42, h: 0.84, align: 'left' },
  { id: 'bottom', x: 0.06, y: 0.62, w: 0.88, h: 0.3, align: 'left' },
  { id: 'top', x: 0.06, y: 0.06, w: 0.88, h: 0.3, align: 'left' },
  { id: 'bottom-right', x: 0.5, y: 0.58, w: 0.44, h: 0.34, align: 'left' },
  { id: 'bottom-left', x: 0.06, y: 0.58, w: 0.44, h: 0.34, align: 'left' },
  { id: 'top-right', x: 0.5, y: 0.06, w: 0.44, h: 0.34, align: 'left' },
  { id: 'top-left', x: 0.06, y: 0.06, w: 0.44, h: 0.34, align: 'left' },
]);

/** Tiles whose centre falls inside the zone. */
function tilesIn(zone, tiles, cols, rows) {
  return tiles.filter((t) => {
    const cx = (t.col + 0.5) / cols;
    const cy = (t.row + 0.5) / rows;
    return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h;
  });
}

/**
 * Score one zone. Lower is better.
 *
 * Detail dominates: type over a face is the failure being fixed, and no amount
 * of darkness excuses it. The worst tile counts as well as the average, so a
 * zone that is calm except for one eye or one hand cannot win on its mean.
 * Brightness is a lighter term, because a scrim can darken a light area but
 * nothing can flatten a busy one.
 */
export function scoreZone(zone, tiles, cols, rows) {
  const inZone = tilesIn(zone, tiles, cols, rows);
  if (inZone.length < 2) return Number.POSITIVE_INFINITY;
  const detail = inZone.reduce((sum, t) => sum + t.stdev, 0) / inZone.length;
  const worst = inZone.reduce((max, t) => Math.max(max, t.stdev), 0);
  const brightness = inZone.reduce((sum, t) => sum + t.mean, 0) / inZone.length;
  return detail * 2 + worst + brightness * 0.35;
}

/**
 * The calmest zone for the quote.
 * @param {Array<{col:number,row:number,mean:number,stdev:number}>} tiles 0..255 values
 */
export function chooseTextZone({ tiles = [], cols = 12, rows = 9 } = {}) {
  if (!Array.isArray(tiles) || !tiles.length) return { ...CANDIDATE_ZONES[2], score: null, measured: false };
  let best = null;
  for (const zone of CANDIDATE_ZONES) {
    const score = scoreZone(zone, tiles, cols, rows);
    if (!Number.isFinite(score)) continue;
    if (!best || score < best.score - 1e-9) best = { ...zone, score, measured: true };
  }
  return best || { ...CANDIDATE_ZONES[2], score: null, measured: false };
}

/**
 * Type size that fills the zone without overflowing it.
 * `measure` returns the pixel width of a string at a given size.
 */
export function fitQuoteLines({ quote, zoneWidth, zoneHeight, measure, maxSize = 96, minSize = 34, lineHeightRatio = 1.2 }) {
  const words = String(quote || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], fontSize: minSize, lineHeight: Math.round(minSize * lineHeightRatio) };

  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (measure(test, size) > zoneWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lineHeight = Math.round(size * lineHeightRatio);
    const tallest = lines.reduce((max, l) => Math.max(max, measure(l, size)), 0);
    if (lines.length * lineHeight <= zoneHeight && tallest <= zoneWidth) {
      return { lines, fontSize: size, lineHeight };
    }
  }

  // Nothing fits cleanly: set at the floor size and let the caller decide.
  const lineHeight = Math.round(minSize * lineHeightRatio);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (measure(test, minSize) > zoneWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return { lines, fontSize: minSize, lineHeight, overflow: lines.length * lineHeight > zoneHeight };
}
