/**
 * What the visitor is currently reading.
 *
 * The gap, 2026-09-10. Archy was built to be context aware, and he is, but only
 * down to the section. On /journal/twenty-points-apart he was told "journal"
 * and nothing else. So the person who has just finished a specific piece, with
 * specific questions raised by that piece, was offered "What does Archetype
 * Original do?" and given an assistant with no idea which of a hundred essays
 * they had in front of them.
 *
 * That is backwards. Someone reads a thing, the thing provokes a question, and
 * the question is about the thing. Knowing which piece they are on is most of
 * what makes the answer feel like it belongs to the page.
 *
 * Deliberately separate from `contextPayload` on the wire. A non-empty
 * contextPayload disables the cannot-answer handoff on the public site, which
 * is correct for ALI screens supplying live data and wrong here.
 */

const TITLE_SUFFIX = / \| Archetype Original\s*$/;

/** Article slug if this path is a single piece, otherwise null. */
export function articleSlugFromPath(pathname) {
  const p = String(pathname ?? '');
  if (!p.startsWith('/journal/')) return null;
  const slug = p.slice('/journal/'.length).split('/')[0].split('?')[0].split('#')[0];
  return slug || null;
}

/**
 * The piece's title, read off the rendered page.
 *
 * The h1 first, because it is the title as the reader is seeing it right now.
 * document.title is the fallback and needs the site suffix removed, otherwise
 * every prompt would end up saying "Archetype Original" back at the reader.
 */
export function readArticleTitle(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null;
  const h1 = doc.querySelector('h1');
  const fromH1 = h1 && h1.textContent ? h1.textContent.trim() : '';
  if (fromH1) return fromH1;
  const fromTitle = String(doc.title || '').replace(TITLE_SUFFIX, '').trim();
  return fromTitle || null;
}

/**
 * The page context sent with a question, or null when there is no single piece
 * in view. Null rather than an empty object, so the server can tell the
 * difference between "no article" and "article we failed to read".
 */
export function buildPageContext(pathname, doc) {
  const slug = articleSlugFromPath(pathname);
  if (!slug) return null;
  const title = readArticleTitle(doc);
  return { kind: 'article', slug, title: title || null, path: pathname };
}

/**
 * Prompts for someone who has just read a specific piece.
 *
 * These replace the generic set on article pages. The reader does not need the
 * company overview; they have just finished eight hundred words and something
 * in it landed. Each of these is a question that piece could plausibly raise,
 * and each one carries the title so Archy knows what "this" refers to even if
 * the page context were dropped on the wire.
 */
export function articleQuickPrompts(title) {
  const t = title && title.trim() ? title.trim() : null;
  if (!t) {
    return [
      { label: 'Unpack this piece', send: 'Unpack the piece I am reading. What is the core argument?' },
      { label: 'Where do I start?', send: 'What is the first thing I should actually do with what I just read?' },
      { label: 'Push back on it', send: 'What is the strongest argument against what I just read?' },
    ];
  }
  return [
    { label: 'Unpack this piece', send: `I just read "${t}". What is the core argument, in plain terms?` },
    { label: 'Where do I start?', send: `After reading "${t}", what is the first thing I should actually do this week?` },
    { label: 'Push back on it', send: `What is the strongest argument against the position in "${t}"?` },
    { label: 'What connects to it?', send: `What else has Bart written that builds on "${t}"?` },
  ];
}
