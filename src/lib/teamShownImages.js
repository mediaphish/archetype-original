/**
 * Pictures a teammate shows in chat as a markdown image, for the side panel.
 *
 * Bart, 2026-10-28: "I can't see the image. It needs to be in the panel as
 * well." Des posted the Nov 5 quote card as ![Who Signs for It? card](url).
 * The chat draws that picture (ChatMarkdown), but the panel only collected
 * [IMAGE_GENERATED] tags, so the card never sat beside its captions.
 *
 * Only pictures saved in Auto's own storage count, so an outside link the
 * team quotes never lands in the panel as if it were work for Bart.
 */

const OWN_STORAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/ao-auto-attachments\//i;

/** Pure: [{ label, url, size }] for each own-storage markdown image in the text. */
export function markdownTeamImages(text) {
  const out = [];
  const re = /!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    if (!OWN_STORAGE.test(m[2])) continue;
    out.push({ label: m[1].trim() || 'Image', url: m[2], size: '' });
  }
  return out;
}
