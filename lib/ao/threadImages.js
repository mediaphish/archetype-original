/**
 * The team sees the images in a conversation, not only their links.
 *
 * Bart, 2026-11-17, on an infographic remake: "Vox should have the ability to
 * see images." A Queue card, a remake or a header lands in the thread as a
 * link to the site's own image storage, and the model only read the link
 * text. This finds the newest of those links and hands the pictures
 * themselves to the turn, so whoever answers can look at what Bart is looking
 * at.
 *
 * Cost: at most two pictures, on the current turn only (never re-sent in the
 * saved history), and only when the recent messages hold one or the message
 * is about an image. About 1,600 tokens a picture.
 */

export const MAX_THREAD_IMAGES = 2;
const RECENT = 6;

// Only pictures in the site's own image storage: never a link from the web.
const STORED_IMAGE = /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s)"'<>\]]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s)"'<>\]]*)?(?=[\s)"'<>\].,;:!?]|$)/gi;
const ABOUT_AN_IMAGE = /\b(image|images|picture|graphic|infographic|card|header|photo|look at|see it|spacing|layout|design)\b/i;

/** Pure: every stored-image link in a piece of text, in order. */
export function storedImageUrls(text) {
  return String(text || '').match(STORED_IMAGE) || [];
}

/**
 * Pure: the newest stored images worth showing on this turn.
 * @param {Array<{ role: string, content: string }>} history  oldest first
 * @param {string} message  what was just said
 * @param {{ skip?: string[], max?: number }} [opts]  skip: pictures already on the turn
 * @returns {string[]} newest first
 */
export function threadImagesToShow(history, message, { skip = [], max = MAX_THREAD_IMAGES } = {}) {
  const seen = new Set(skip);
  const out = [];
  const take = (text) => {
    for (const url of storedImageUrls(text).reverse()) {
      if (out.length >= max) return;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  };
  const list = Array.isArray(history) ? history : [];
  take(message);
  for (const m of list.slice(-RECENT).reverse()) take(m?.content);
  // Further back (a Queue card opens the thread), only when the talk is about a picture.
  if (!out.length && ABOUT_AN_IMAGE.test(String(message || ''))) {
    for (const m of list.slice(0, -RECENT).reverse()) take(m?.content);
  }
  return out;
}

/** Pure: the turn's content with the pictures in front of the words. */
export function withThreadImages(content, urls) {
  if (!urls?.length) return content;
  const parts = Array.isArray(content) ? content : [{ type: 'text', text: String(content ?? '') }];
  const blocks = urls.map((url) => ({ type: 'image', source: { type: 'url', url } }));
  const note = {
    type: 'text',
    text: `[The ${urls.length === 1 ? 'picture' : `${urls.length} pictures`} from this conversation, newest first: ${urls.join(' , ')}. Look at ${urls.length === 1 ? 'it' : 'them'} before you judge or describe ${urls.length === 1 ? 'it' : 'them'}.]`,
  };
  return [...blocks, note, ...parts];
}
