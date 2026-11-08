/**
 * @jest-environment node
 *
 * 2026-11-08: server pieces read images from the live site instead of packing copies.
 */
import { siteImageName, readSiteImage } from '../ao/siteImage.js';

afterEach(() => { delete global.fetch; });

test('names normalize from any form', () => {
  expect(siteImageName('public/images/cards-clean/variation_03.jpg')).toBe('cards-clean/variation_03.jpg');
  expect(siteImageName('/images/ao-logo-black.png')).toBe('ao-logo-black.png');
  expect(siteImageName('/var/task/public/images/reshare-backgrounds/a.png')).toBe('reshare-backgrounds/a.png');
});

test('a page sent back for a missing file is not an image', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'text/html' }, arrayBuffer: async () => new ArrayBuffer(4) }));
  expect(await readSiteImage('no-such-file-xyz.png')).toBeNull();
  global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new ArrayBuffer(4) }));
  expect((await readSiteImage('no-such-file-xyz.png')).length).toBe(4);
});
