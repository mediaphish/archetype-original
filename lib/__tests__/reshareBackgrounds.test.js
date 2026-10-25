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
import { BACKGROUNDS, backgroundFile, pickBackground } from '../ao/reshareBackgrounds.js';
import { redContrast } from '../ao/generateReshareCardImage.js';

const root = process.cwd();

test('the reshare job never edits a photo or calls an image model', () => {
  const src = readFileSync(join(root, 'api/ao/auto/reshare-journal.js'), 'utf8');
  expect(src).not.toMatch(/images\/edits|images\/generations|getOpenAiKey|OPENAI_IMAGE_MODEL|editPhotoWithDallE/);
  expect(src).toMatch(/composeReshareOnBackground/);
});

test('every approved background is on disk at 1536 x 1024, with its open side', () => {
  expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(10);
  for (const b of BACKGROUNDS) {
    const file = join(root, backgroundFile(b.id));
    expect(existsSync(file)).toBe(true);
    const png = readFileSync(file);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1536, 1024]);
    expect(['left', 'right']).toContain(b.text);
  }
});

test('the least recently used photo comes next; unused ones first', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  expect(pickBackground(['a', 'b'], list).id).toBe('c');
  expect(pickBackground(['c', 'b', 'a'], list).id).toBe('a');
});

test('red is kept only where it stands out', () => {
  expect(redContrast(0.01)).toBeGreaterThan(3);
  expect(redContrast(0.2)).toBeLessThan(3);
});
