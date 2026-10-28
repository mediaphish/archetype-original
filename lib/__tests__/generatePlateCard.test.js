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
  ORIGINAL_PLATE_DIR,
  lockupBoxFor,
  lockupPlacement,
  lockupSvgText,
} from '../ao/generatePlateCard.js';
import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';

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

const originals = () => listPlates(ORIGINAL_PLATE_DIR).filter((n) => !n.startsWith('variation_04'));

withPlates('measureLockup', () => {
  it('finds a lockup on every plate, well below centre', async () => {
    for (const name of originals()) {
      const buf = fs.readFileSync(path.join(ORIGINAL_PLATE_DIR, name));
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
    const found = originals().filter((n) => wanted.includes(n.replace(/\.[^.]+$/, '')));
    expect(found).toHaveLength(wanted.length);

    for (const name of found) {
      const { side } = await measureLockup(fs.readFileSync(path.join(ORIGINAL_PLATE_DIR, name)));
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

// 2026-10-28. Bart: "It cannot deviate. It cannot interpret. It cannot modify
// the SVG that we are using for my logo." The plates carried a redrawn lockup
// with the top of the A flattened.
withPlates('the lockup is Bart\'s file, exactly', () => {
  it('every plate in rotation has a recorded spot for it, on the side the type avoids', () => {
    for (const plate of listPlates()) {
      const box = lockupBoxFor(plate);
      expect(box).toBeTruthy();
      expect(['left', 'right']).toContain(box.side);
    }
    expect(listPlates().some((n) => n.startsWith('variation_04'))).toBe(false);
    // His arms are covered on every card (2026-10-28): the rolled-sleeve plates are out.
    expect(listPlates().some((n) => /^variation_0[19]\./.test(n))).toBe(false);
  });

  it('the logo on a finished card is the lockup file drawn unaltered', async () => {
    const plate = 'variation_08.jpg';
    const card = await renderPlateCard({ plate, quote: QUOTE, attribution: 'Bart Paden' });
    const at = lockupPlacement(lockupBoxFor(plate));
    // Draw the file alone on the clean plate at the same spot; the card must match it there.
    const bare = await loadImage(await sharp(path.join(PLATE_DIR, plate)).png().toBuffer());
    const canvas = createCanvas(bare.width, bare.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bare, 0, 0);
    ctx.drawImage(await loadImage(Buffer.from(lockupSvgText())), at.x, at.y, at.w, at.h);
    const region = { left: at.x, top: at.y, width: at.w, height: at.h };
    const a = await sharp(card).extract(region).raw().toBuffer();
    const b = await sharp(canvas.toBuffer('image/png')).extract(region).raw().toBuffer();
    expect(a.equals(b)).toBe(true);
  }, 30000);

  it('the lockup source is the brand file and nothing in it is rewritten but its colour', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'brand', 'archetype-original-lockup.svg'), 'utf8');
    const paths = (t) => (t.match(/ d="[^"]+"/g) || []).join('');
    expect(paths(lockupSvgText())).toBe(paths(raw));
    expect(paths(raw).length).toBeGreaterThan(1000);
  });
});

// 2026-10-28: cards run without Bart's review, so the checks his review was are enforced.
describe('a card credited to Bart prints his own sentence', () => {
  const { findQuoteSource, fixDevotionalLinks, normalizeForMatch } = require('../ao/quoteSource.js');
  const docs = [{ slug: 'fundamentals', body: 'Put servant leadership and justice together and you get something sturdy: standards with a spine, presence without theater, enforcement without ego.' }];

  it('matches his sentence through formatting, and rejects a rewording', () => {
    expect(findQuoteSource('Put servant leadership and justice together and you get something *sturdy*', docs)).toBeTruthy();
    expect(findQuoteSource('“Standards with a spine, presence without theater”', docs)).toBeTruthy();
    expect(findQuoteSource('Justice without servant leadership turns into enforcement for its own sake.', docs)).toBeNull();
    expect(normalizeForMatch("leader’s — chair")).toBe('leaders chair');
  });

  it('a devotional is linked at the devotional page, a journal post stays put', () => {
    const slugs = new Set(['before-the-sun-sets']);
    expect(fixDevotionalLinks('Read it: https://www.archetypeoriginal.com/journal/before-the-sun-sets', slugs)).toBe('Read it: https://www.archetypeoriginal.com/faith?slug=before-the-sun-sets');
    expect(fixDevotionalLinks('https://archetypeoriginal.com/journal/who-signs-for-it', slugs)).toBe('https://archetypeoriginal.com/journal/who-signs-for-it');
  });

  it('only cards on his clean plates, made after the logo fix, are scheduled as they are', () => {
    const { isPlateCardUrl } = require('../ao/generatePlateCard.js');
    const base = 'https://x.supabase.co/storage/v1/object/public/ao-auto-attachments';
    expect(isPlateCardUrl(`${base}/auto-hub-quote-cards/plate-variation_13-1793300000000.png`)).toBe(true);
    // A plate out of rotation (his tattooed forearms show) never qualifies.
    expect(isPlateCardUrl(`${base}/auto-hub-quote-cards/plate-variation_01-1793300000000.png`)).toBe(false);
    expect(isPlateCardUrl(`${base}/auto-hub-quote-cards/plate-variation_13-1793203169532.png`)).toBe(false);
    expect(isPlateCardUrl(`${base}/weekly-pull-quote-cards/b9b0a538.png`)).toBe(false);
  });
});
