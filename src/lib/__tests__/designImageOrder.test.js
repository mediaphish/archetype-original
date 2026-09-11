/**
 * The Cain header regression: a reference photo uploaded first kept sitting on
 * top of every image Auto generated afterwards.
 */
import { orderDesignImagesNewestFirst } from '../designImageOrder.js';

describe('orderDesignImagesNewestFirst', () => {
  it('puts a later generated image above an earlier manual upload', () => {
    // Construction order the panel actually produced: message images first,
    // manual uploads appended after.
    const images = [
      { url: 'generated.png', label: 'the-cain-archetype', addedAt: 2_000 },
      { url: 'reference.jpg', label: 'The Cain Archetype (direct to draft, not via chat)', addedAt: 1_000, manualUpload: true },
    ];
    expect(orderDesignImagesNewestFirst(images).map((i) => i.url)).toEqual(['generated.png', 'reference.jpg']);
  });

  it('still puts a newer manual upload on top', () => {
    const images = [
      { url: 'generated.png', addedAt: 1_000 },
      { url: 'upload.jpg', addedAt: 2_000, manualUpload: true },
    ];
    expect(orderDesignImagesNewestFirst(images)[0].url).toBe('upload.jpg');
  });

  it('falls back to later-added first when times are missing or equal', () => {
    const images = [{ url: 'a' }, { url: 'b' }, { url: 'c', addedAt: 5 }, { url: 'd', addedAt: 5 }];
    expect(orderDesignImagesNewestFirst(images).map((i) => i.url)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('does not mutate its input', () => {
    const images = [{ url: 'a', addedAt: 1 }, { url: 'b', addedAt: 2 }];
    orderDesignImagesNewestFirst(images);
    expect(images.map((i) => i.url)).toEqual(['a', 'b']);
  });

  it('tolerates junk', () => {
    expect(orderDesignImagesNewestFirst(null)).toEqual([]);
  });
});
