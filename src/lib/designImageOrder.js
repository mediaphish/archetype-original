/**
 * Order the artifact panel's generated images newest first, by real time.
 *
 * The bug, 2026-09-11, Cain thread. The panel built its list from chat messages
 * first, appended manual uploads after, then reversed the whole list to show
 * "newest first". Reversing construction order is not the same as sorting by
 * time: a manual upload always landed on top, however old it was. Bart uploaded
 * a reference photo before asking for the header, so every image Auto generated
 * afterwards sat underneath it, below the fold of a half-height scroll box, and
 * the panel looked like it had ignored the generation. It had worked exactly
 * once, before any reference upload existed.
 */
export function orderDesignImagesNewestFirst(images) {
  return (Array.isArray(images) ? images : [])
    .map((img, index) => ({ img, index }))
    .sort((a, b) => {
      const diff = (Number(b.img?.addedAt) || 0) - (Number(a.img?.addedAt) || 0);
      // Same or missing timestamps keep the later-added entry on top, which is
      // what the old reverse() did and is the right tiebreak.
      return diff !== 0 ? diff : b.index - a.index;
    })
    .map(({ img }) => img);
}
