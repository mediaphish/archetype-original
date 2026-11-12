/**
 * @jest-environment node
 *
 * Quadrant spacing (Bart, 2026-11-12, on "They Still Call Him"): "The text to
 * the right of the Care arrow touches the boxes beside them. We need to be as
 * specific as we can with spacing."
 *
 * The side label (and the bottom label) must have a clear, empty gap between
 * it and the squares. The canvas module uses import.meta, which Jest cannot
 * load, so the render runs in a plain Node child process and reports back.
 */
import { execFileSync } from 'child_process';
import { join } from 'path';

const cell = (name) => ({ name, line: 'A line long enough to wrap onto a second row inside the square.' });
const content = {
  layout: 'quadrant',
  look: 'bold',
  mood: 'standards',
  kicker: 'The leader you had',
  title: 'Same demand, same standard. The difference was the care.',
  subtitle: 'From the outside you could not have told them apart.',
  x_label: 'Demand and standard',
  y_label: 'Care for the person',
  cells: { both_low: cell('Low'), x_only: cell('X only'), y_only: cell('Y only'), both_high: cell('Both high') },
  principle: 'Take the care out and you still get results.',
};

const script = `
const { pathToFileURL } = await import('url');
const { loadImage, createCanvas } = await import('@napi-rs/canvas');
const m = await import(pathToFileURL(process.argv[1]).href);
const r = await m.renderInfographicPng(JSON.parse(process.argv[2]));
if (!r.ok) { console.log(JSON.stringify({ ok: false, error: r.error })); process.exit(0); }
const img = await loadImage(r.buffer);
const c = createCanvas(img.width, img.height);
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
// Find the squares' left edge: the first strong change scanning right along the middle row.
const midY = Math.round(img.height * 0.55);
const row = ctx.getImageData(0, midY, img.width, 1).data;
const lum = (d, i) => (d[i] + d[i + 1] + d[i + 2]) / 3;
const ground = lum(ctx.getImageData(img.width - 20, 20, 1, 1).data, 0);
// Ink columns in the left gutter (label and arrow), then the square's border.
const inkCols = [];
for (let x = 0; x < img.width / 3; x++) {
  let ink = false;
  const col = ctx.getImageData(x, Math.round(img.height * 0.42), 1, Math.round(img.height * 0.26)).data;
  for (let i = 0; i < col.length; i += 4) if (Math.abs(lum(col, i) - ground) > 40) { ink = true; break; }
  inkCols.push(ink);
}
// Runs of ink: arrow, label, square edge. The gap before the last run is the label-to-square clearance.
const runs = [];
inkCols.forEach((ink, x) => {
  if (ink && (!runs.length || runs[runs.length - 1].end !== x - 1)) runs.push({ start: x, end: x });
  else if (ink) runs[runs.length - 1].end = x;
});
console.log(JSON.stringify({ ok: true, runs, clear: m.QUADRANT_CLEAR }));
`;

test('the side label never touches the squares or the arrow', () => {
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script, join(__dirname, '../ao/infographicCanvas.js'), JSON.stringify(content)],
    { encoding: 'utf8', cwd: join(__dirname, '../..') },
  );
  const r = JSON.parse(out.trim().split('\n').pop());
  expect(r.ok).toBe(true);
  // Arrow, label, then the squares: three separate runs of ink with empty space between.
  expect(r.runs.length).toBeGreaterThanOrEqual(3);
  const [arrow, label, square] = r.runs;
  expect(label.start - arrow.end).toBeGreaterThanOrEqual(12);
  expect(square.start - label.end).toBeGreaterThanOrEqual(16);
}, 30000);
