/**
 * @jest-environment node
 *
 * Grid spacing (Bart, 2026-11-17, on "Accountability Is a Design Problem", the
 * third spacing miss): the column labels touched the top and bottom of their
 * bars. Every label needs clear space above and below it, and every
 * infographic runs the spacing check as it is drawn.
 *
 * The canvas module uses import.meta, which Jest cannot load, so the render
 * runs in a plain Node child process and reports back.
 */
import { execFileSync } from 'child_process';
import { join } from 'path';

const accountability = {
  layout: 'grid',
  look: 'classic',
  mood: 'standards',
  kicker: 'Structural correction',
  title: 'Accountability is a design problem',
  subtitle: 'Goodwill fades. Culture bends. What is built into the structure holds under pressure.',
  columns: ['Relying on goodwill', 'Relying on culture', 'Built by design'],
  rows: [
    ['Heard when the leader feels like receiving it', 'Fades when disagreement reads as disloyalty', 'Upward dissent is protected, not merely tolerated'],
    ['Shared when mood and timing allow', 'Narrows when reputation is on the line', 'Information moves upward without relational leverage'],
    ['Depends on whether the leader welcomes it', 'Drifts when growth and financial strain hit', 'Real pathways to surface impact without retaliation'],
    ['Leaves when the good leader leaves', 'Changes when a stronger personality takes over', 'Survives leader personality shifts'],
    ['Feedback gets shortened and summarized', 'Bends toward whatever the structure protects', 'Assumes future weakness and builds for it'],
  ],
  principle: 'If you do not have structural correction, you are relying on virtue. Design endures.',
};

const script = `
const { pathToFileURL } = await import('url');
const { loadImage, createCanvas } = await import('@napi-rs/canvas');
const m = await import(pathToFileURL(process.argv[1]).href);
const out = [];
for (const content of JSON.parse(process.argv[2])) {
  const r = await m.renderInfographicPng(content);
  if (!r.ok) { out.push({ ok: false, error: r.error }); continue; }
  const img = await loadImage(r.buffer);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  // Down the middle of the first column label: the dark bar, light letters, the bar again.
  const x = Math.round(72 + (1080 - 144 - 20) / 6);
  const col = ctx.getImageData(x, 380, 1, 260).data;
  const lum = (i) => (col[i] + col[i + 1] + col[i + 2]) / 3;
  const kinds = [];
  for (let i = 0; i < col.length; i += 4) kinds.push(lum(i) < 60 ? 'bar' : lum(i) > 150 ? 'light' : 'mid');
  const barTop = kinds.indexOf('bar');
  let barEnd = barTop;
  while (barEnd + 1 < kinds.length && kinds[barEnd + 1] !== 'light' || (kinds.slice(barEnd + 1, barEnd + 40).includes('bar') && barEnd + 1 < kinds.length)) barEnd++;
  const inside = kinds.slice(barTop, barEnd + 1);
  const firstInk = inside.findIndex((k) => k !== 'bar');
  const lastInk = inside.length - 1 - [...inside].reverse().findIndex((k) => k !== 'bar');
  out.push({ ok: true, spacing: r.spacing, barHeight: inside.length, above: firstInk, below: inside.length - 1 - lastInk });
}
console.log(JSON.stringify({ pad: m.GRID_HEAD_PAD, out }));
`;

function render(contents) {
  const raw = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script, join(__dirname, '../ao/infographicCanvas.js'), JSON.stringify(contents)],
    { encoding: 'utf8', cwd: join(__dirname, '../..') },
  );
  return JSON.parse(raw.trim().split('\n').pop());
}

test('two-line column labels keep clear space above and below inside their bars, and the check passes', () => {
  const crowded = {
    ...accountability,
    rows: accountability.rows.map((r) => r.map(() => 'A line so long that it cannot possibly fit inside a single small table cell no matter how small the type gets in the end')),
  };
  const r = render([accountability, crowded]);
  const [clean, tight] = r.out;
  expect(clean.ok).toBe(true);
  expect(clean.spacing).toEqual({ ok: true, issues: [] });
  // Antialiased edges cost a few pixels; the label must still sit well clear of both edges.
  expect(clean.above).toBeGreaterThanOrEqual(r.pad - 6);
  expect(clean.below).toBeGreaterThanOrEqual(r.pad - 6);
  // Text that cannot fit its box is named, so the team never says spacing is fine when it is not.
  expect(tight.spacing.ok).toBe(false);
  expect(tight.spacing.issues[0]).toMatch(/runs past the bottom of its box/);
}, 30000);
