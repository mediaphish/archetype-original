/**
 * @jest-environment node
 *
 * These run against the real plates in public/images/cards, deliberately.
 *
 * The bugs this file exists to catch were all bugs about the plates themselves,
 * not about arithmetic: a lockup detector that found a cream cardigan, an
 * orientation assumption that put the quote across the subject's chest, and a
 * C2PA metadata chunk that made the decoder reject the file outright. None of
 * those would show up against a synthetic fixture, because a synthetic fixture
 * is exactly the image the code already expects.
 */
import fs from 'fs';
import path from 'path';
import {
  listPlates,
  measureLockup,
  renderPlateCard,
  PLATE_DIR,
} from '../ao/generatePlateCard.js';

const QUOTE = 'Leaders and their teams are *twenty points apart* on the same question.';
const havePlates = fs.existsSync(PLATE_DIR) && listPlates().length > 0;
const withPlates = havePlates ? describe : describe.skip;

describe('listPlates', () => {
  it('ignores the .DS_Store Finder leaves behind', () => {
    // Not hypothetical: Finder had already dropped one into the plate folder,
    // and an extension-blind filter would hand it to the renderer as a plate.
    expect(listPlates().some((n) => n.startsWith('.'))).toBe(false);
  });

  it('returns only image files', () => {
    for (const name of listPlates()) {
      expect(path.extname(name).toLowerCase()).toMatch(/^\.(png|jpe?g|webp)$/);
    }
  });
});

withPlates('measureLockup', () => {
  it('finds a lockup on every plate, well below centre', async () => {
    for (const name of listPlates()) {
      const buf = fs.readFileSync(path.join(PLATE_DIR, name));
      const { side, top } = await measureLockup(buf);
      expect(['left', 'right']).toContain(side);
      // Every lockup measured across the set sits between 0.75 and 0.86. A
      // result near 0.5 is the signature of the old bug, where bright clothing
      // in the middle of the frame was mistaken for white ink.
      expect(top).toBeGreaterThan(0.6);
      expect(top).toBeLessThan(0.95);
    }
  }, 60000);

  it('reads the mirrored plates as right-handed', async () => {
    // variation_08 and variation_10 put the subject on the left. Assuming the
    // lockup is always bottom-left laid the quote over his chest.
    //
    // Matched by basename, not filename. An earlier version hardcoded
    // "variation_08.png"; when the plates were converted to JPEG it matched
    // nothing, skipped its own body, and reported green in one millisecond. A
    // test that quietly stops testing is worse than no test, so this one fails
    // loudly if the plates it needs are not there.
    const wanted = ['variation_08', 'variation_10'];
    const found = listPlates().filter((n) => wanted.includes(n.replace(/\.[^.]+$/, '')));
    expect(found).toHaveLength(wanted.length);

    for (const name of found) {
      const { side } = await measureLockup(fs.readFileSync(path.join(PLATE_DIR, name)));
      expect(side).toBe('right');
    }
  }, 30000);
});

withPlates('renderPlateCard', () => {
  it('returns a PNG at the plate resolution', async () => {
    const plate = listPlates()[0];
    const out = await renderPlateCard({ plate, quote: QUOTE, attribution: 'Gallup, 2026' });
    // PNG magic number. A JPEG here would mean the encoder silently changed.
    expect(out.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(out.length).toBeGreaterThan(10000);
  }, 30000);

  it('decodes plates carrying a C2PA chunk', async () => {
    // gpt-image-1 writes a caBX provenance chunk into every PNG, and
    // @napi-rs/canvas rejects the whole file with "Invalid SVG image" rather
    // than skipping it. Re-encoding through sharp is the strip. If that
    // re-encode is ever removed, every plate fails here.
    for (const plate of listPlates()) {
      await expect(renderPlateCard({ plate, quote: 'Short quote.' })).resolves.toBeInstanceOf(Buffer);
    }
  }, 120000);

  it('renders without an attribution', async () => {
    const plate = listPlates()[0];
    await expect(renderPlateCard({ plate, quote: QUOTE })).resolves.toBeInstanceOf(Buffer);
  }, 30000);

  it('names the available plates when asked for one that does not exist', async () => {
    await expect(renderPlateCard({ plate: 'nope.png', quote: QUOTE })).rejects.toThrow(/plate not found/i);
  });

  it('requires a quote', async () => {
    const plate = listPlates()[0];
    await expect(renderPlateCard({ plate, quote: '  ' })).rejects.toThrow(/quote is required/i);
  });
});
