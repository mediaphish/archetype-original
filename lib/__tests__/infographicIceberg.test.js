/**
 * @jest-environment node
 *
 * Iceberg infographic (Bart, 2026-11-06): the part under the water needs
 * definition, not a flat mass that "just looks like a blob".
 *
 * The canvas module uses import.meta, which Jest cannot load, so the render
 * runs in a plain Node child process and reports back what it measured.
 */
import { execFileSync } from 'child_process';
import { join } from 'path';

const content = {
  layout: 'iceberg',
  look: 'night',
  mood: 'warning',
  kicker: 'Power vs. authority',
  title: 'The hunger starts before the power arrives',
  subtitle: 'Compliance looks the same either way.',
  above_label: 'What the room sees',
  above: ['A team that follows', 'Hard work and real results'],
  below_label: 'What is really running',
  below: ['Calculating the position', 'Asking what it does for me', 'Questions closed early'],
  principle: 'The hunger is not the problem.',
};

const script = `
const { pathToFileURL } = await import('url');
const { loadImage, createCanvas } = await import('@napi-rs/canvas');
const { renderInfographicPng } = await import(pathToFileURL(process.argv[1]).href);
const r = await renderInfographicPng(JSON.parse(process.argv[2]));
if (!r.ok) { console.log(JSON.stringify({ ok: false, error: r.error })); process.exit(0); }
const img = await loadImage(r.buffer);
const c = createCanvas(img.width, img.height);
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
// A strip across the berg, well below the waterline and left of the text column.
const { data } = ctx.getImageData(80, Math.round(img.height * 0.66), 420, 1);
const shades = new Set();
for (let i = 0; i < data.length; i += 4) shades.add(Math.round((data[i] + data[i + 1] + data[i + 2]) / 3 / 6));
console.log(JSON.stringify({ ok: true, shades: shades.size }));
`;

test('the submerged berg has edges and shading, not one flat colour', () => {
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script, join(__dirname, '../ao/infographicCanvas.js'), JSON.stringify(content)],
    { encoding: 'utf8', cwd: join(__dirname, '../..') },
  );
  const r = JSON.parse(out.trim().split('\n').pop());
  expect(r.ok).toBe(true);
  // A flat translucent fill gives two or three levels (water, mass, maybe an edge).
  expect(r.shades).toBeGreaterThan(5);
}, 30000);
