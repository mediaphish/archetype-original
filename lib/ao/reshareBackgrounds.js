/**
 * The only photos a journal reshare may use: Bart's own approved set.
 *
 * Bart, 2026-10-24, after rejecting an OpenAI-relit photo of himself ("It is
 * exactly what I was afraid of"), sent ten backgrounds and said: "Please note
 * the left and right shift. Also, I need you to lock Auto out of touching the
 * image themselves. All it can do is add the text in style with the brand. ...
 * The font has weight. The AO logo always in the bottom corner."
 *
 * So each photo is drawn exactly as he made it, full frame, never edited,
 * cropped, relit or sent to an image model. `text` is the open side, opposite
 * where Bart is, and it is where the quote and the logo go. To add a photo:
 * put the PNG (1536 x 1024) in public/images/reshare-backgrounds/ and add a
 * line here with the side that is open.
 *
 * 002 is left out on purpose (Bart, 2026-10-24: "It reads as a duplicate and
 * is the lesser quality image" of 001). The file stays on disk, unused.
 */

export const BACKGROUNDS = [
  { id: 'bart-reshare-001', text: 'left' },
  { id: 'bart-reshare-003', text: 'right' },
  { id: 'bart-reshare-004', text: 'left' },
  { id: 'bart-reshare-005', text: 'right' },
  { id: 'bart-reshare-006', text: 'left' },
  { id: 'bart-reshare-007', text: 'right' },
  { id: 'bart-reshare-008', text: 'right' },
  { id: 'bart-reshare-009', text: 'left' },
  { id: 'bart-reshare-010', text: 'right' },
  { id: 'bart-reshare-011', text: 'left' },
];

export const BACKGROUND_DIR = 'public/images/reshare-backgrounds';

export function backgroundFile(id) {
  return `${BACKGROUND_DIR}/${id}.png`;
}

/** The photo used least recently, so the same one does not come around twice in a row. */
export function pickBackground(recentIds = [], list = BACKGROUNDS) {
  const lastUse = new Map();
  recentIds.forEach((id, i) => {
    if (!lastUse.has(id)) lastUse.set(id, i);
  });
  // Never used beats used; among used, the one used longest ago.
  const ranked = list.slice().sort((a, b) => (lastUse.has(b.id) ? lastUse.get(b.id) : Infinity) - (lastUse.has(a.id) ? lastUse.get(a.id) : Infinity));
  return ranked[0];
}
