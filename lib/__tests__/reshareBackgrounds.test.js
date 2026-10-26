/**
 * @jest-environment node
 *
 * Bart, 2026-10-24: "I need you to lock Auto out of touching the image
 * themselves. All it can do is add the text in style with the brand." These
 * tests fail if a reshare ever sends a photo to an image model again, or if a
 * background is missing or the wrong size.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BACKGROUNDS, backgroundFile, pickBackground, availableBackgrounds, chooseBackgroundFor } from '../ao/reshareBackgrounds.js';
import { redContrast } from '../ao/generateReshareCardImage.js';

const root = process.cwd();

test('the reshare job never edits a photo or calls an image model', () => {
  const src = readFileSync(join(root, 'api/ao/auto/reshare-journal.js'), 'utf8');
  expect(src).not.toMatch(/images\/edits|images\/generations|getOpenAiKey|OPENAI_IMAGE_MODEL|editPhotoWithDallE/);
  expect(src).toMatch(/composeReshareInBartStyle/);
});

test('every approved background is on disk at 1536 x 1024, with its open side', () => {
  expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(9);
  expect(BACKGROUNDS.map((b) => b.id)).not.toContain('bart-reshare-002');
  for (const b of BACKGROUNDS) {
    const file = join(root, backgroundFile(b.id));
    expect(existsSync(file)).toBe(true);
    const png = readFileSync(file);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1536, 1024]);
    expect(['left', 'right']).toContain(b.text);
  }
});

test('all twenty photos are in, 002 stays out, and each has a scene and mood', () => {
  expect(BACKGROUNDS).toHaveLength(20);
  for (let i = 1; i <= 21; i += 1) {
    const id = `bart-reshare-${String(i).padStart(3, '0')}`;
    expect(BACKGROUNDS.some((b) => b.id === id)).toBe(i !== 2);
  }
  for (const b of BACKGROUNDS) {
    expect(b.scene.length).toBeGreaterThan(10);
    expect(b.mood.length).toBeGreaterThan(10);
  }
});

test('random among photos not used lately; a fitting photo is preferred', () => {
  const list = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
  // The last three used wait their turn.
  for (const r of [0, 0.4, 0.99]) expect(['d', 'e', 'f']).toContain(pickBackground(['a', 'b', 'c'], list, { rand: () => r }).id);
  // Among the open ones, only the fitting ones are picked.
  for (const r of [0, 0.6, 0.99]) expect(['e', 'f']).toContain(pickBackground(['a'], list, { fitIds: ['e', 'f', 'a'], rand: () => r }).id);
  // A fitting photo used lately is not picked again.
  expect(pickBackground(['a', 'b', 'c'], list, { fitIds: ['a'], rand: () => 0 }).id).toBe('d');
  expect(availableBackgrounds(['a', 'b', 'c', 'd', 'e', 'f'], list, 6)).toHaveLength(6);
});

test('the matcher only names photos from the list, and falls back to random', async () => {
  const fits = await chooseBackgroundFor({ quote: 'Rest is an act of trust.', complete: async () => ({ best: ['bart-reshare-004', 'nope'] }) });
  expect(fits.id).toBe('bart-reshare-004');
  const down = await chooseBackgroundFor({ quote: 'q', complete: async () => { throw new Error('x'); } });
  expect(BACKGROUNDS.map((b) => b.id)).toContain(down.id);
});

test('red is kept only where it stands out', () => {
  expect(redContrast(0.01)).toBeGreaterThan(3);
  expect(redContrast(0.2)).toBeLessThan(3);
});
