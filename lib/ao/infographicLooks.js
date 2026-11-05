/**
 * The looks an infographic can wear, kept apart from its layout.
 *
 * Bart, 2026-11-05: "The infographics are starting to look the same and we're
 * just getting started. I think we need to use broader styles and structures
 * for these." Every graphic had the same frame: one ground, the same headline
 * with a brush stroke, the same pull quote. Now the layout (what the idea is
 * shaped like) and the look (ground, headline, closing line) are chosen
 * separately, so the same layout can come back looking new.
 *
 * Pure, so the picker can be tested without drawing anything.
 */

/** ground: paper, ink or red. head: how the headline is set. close: how the closing line is set. */
export const LOOKS = {
  classic: { ground: 'paper', head: 'editorial', close: 'quote' },
  night: { ground: 'ink', head: 'editorial', close: 'quote' },
  poster: { ground: 'red', head: 'display', close: 'bar' },
  banner: { ground: 'paper', head: 'band', close: 'center' },
  bold: { ground: 'paper', head: 'display', close: 'bar' },
  marquee: { ground: 'ink', head: 'band', close: 'center' },
};

const ALL = ['paper', 'ink', 'red'];

/** The grounds each layout reads well on. Stages and the grid are built from ink tints, so they stay on paper. */
export const LAYOUT_GROUNDS = {
  framework: ALL,
  paths: ['paper', 'red'],
  myths: ['paper', 'ink'],
  stages: ['paper'],
  lessons: ['paper', 'ink'],
  pillars: ALL,
  grid: ['paper'],
  quadrant: ALL,
  cycle: ALL,
  questions: ALL,
  statement: ALL,
  iceberg: ALL,
  scale: ALL,
  staircase: ['paper', 'ink'],
  dial: ALL,
  path: ALL,
};

/** What each layout looked like before looks existed, so older graphics redraw the same. */
const FIRST_LOOK = { framework: 'night', pillars: 'night' };

export function defaultLook(layout) {
  return FIRST_LOOK[layout] || 'classic';
}

/** Layouts too full for the tall display headline: their cards ran out of room under it (2026-11-05 samples). */
const NO_DISPLAY_HEAD = new Set(['framework', 'cycle', 'stages', 'grid', 'pillars', 'dial', 'scale', 'iceberg', 'questions']);

export function looksFor(layout) {
  const grounds = LAYOUT_GROUNDS[layout] || ['paper'];
  return Object.keys(LOOKS).filter((k) => grounds.includes(LOOKS[k].ground) && !(NO_DISPLAY_HEAD.has(layout) && LOOKS[k].head === 'display'));
}

/**
 * The look used least lately that this layout can wear, and never the same
 * look twice in a row. `recent` is newest first: [{ look }].
 */
export function nextLook(layout, recent = []) {
  const options = looksFor(layout);
  const counts = Object.fromEntries(options.map((k) => [k, 0]));
  for (const r of recent) if (counts[r?.look] !== undefined) counts[r.look] += 1;
  const last = recent[0]?.look;
  const pool = options.length > 1 ? options.filter((k) => k !== last) : options;
  return pool.slice().sort((a, b) => counts[a] - counts[b])[0];
}
