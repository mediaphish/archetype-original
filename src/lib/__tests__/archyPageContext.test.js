/**
 * @jest-environment jsdom
 *
 * Archy knowing which piece is on screen, checked at the edges.
 *
 * The failure this guards is quiet. If the slug is wrong or the title comes
 * back with the site suffix attached, nothing errors: the prompts just read
 * slightly wrong and the server pins the wrong document into retrieval, which
 * primes Archy to discuss something the reader is not looking at.
 */
import {
  articleSlugFromPath,
  readArticleTitle,
  buildPageContext,
  articleQuickPrompts,
} from '../archyPageContext.js';

describe('articleSlugFromPath', () => {
  it.each([
    ['/journal/twenty-points-apart', 'twenty-points-apart'],
    ['/journal/twenty-points-apart/', 'twenty-points-apart'],
    ['/journal/x?utm_source=rss', 'x'],
    ['/journal/x#section', 'x'],
  ])('%s gives %s', (path, slug) => {
    expect(articleSlugFromPath(path)).toBe(slug);
  });

  it.each([
    // The listing page is not a piece. Treating it as one would pin an
    // arbitrary document and offer prompts about an essay nobody opened.
    ['/journal'],
    ['/journal/'],
    ['/consulting'],
    ['/'],
    [''],
    [null],
  ])('%s is not an article', (path) => {
    expect(articleSlugFromPath(path)).toBeNull();
  });
});

describe('readArticleTitle', () => {
  it('prefers the h1, which is the title the reader is looking at', () => {
    document.body.innerHTML = '<h1>Twenty Points Apart</h1>';
    document.title = 'Something Else | Archetype Original';
    expect(readArticleTitle(document)).toBe('Twenty Points Apart');
  });

  it('falls back to document.title with the site suffix removed', () => {
    document.body.innerHTML = '';
    document.title = 'Twenty Points Apart | Archetype Original';
    // Leaving the suffix on would have every prompt saying the brand name back
    // at the reader.
    expect(readArticleTitle(document)).toBe('Twenty Points Apart');
  });

  it('returns null when there is nothing to read', () => {
    document.body.innerHTML = '';
    document.title = '';
    expect(readArticleTitle(document)).toBeNull();
  });
});

describe('buildPageContext', () => {
  it('describes the piece in view', () => {
    document.body.innerHTML = '<h1>Twenty Points Apart</h1>';
    expect(buildPageContext('/journal/twenty-points-apart', document)).toEqual({
      kind: 'article',
      slug: 'twenty-points-apart',
      title: 'Twenty Points Apart',
      path: '/journal/twenty-points-apart',
    });
  });

  it('is null off an article, so the generic prompts still apply', () => {
    expect(buildPageContext('/consulting', document)).toBeNull();
    expect(buildPageContext('/journal', document)).toBeNull();
  });

  it('still reports the slug when the title cannot be read', () => {
    document.body.innerHTML = '';
    document.title = '';
    const ctx = buildPageContext('/journal/x', document);
    // Slug is what pins retrieval, so a missing title must not lose the piece.
    expect(ctx.slug).toBe('x');
    expect(ctx.title).toBeNull();
  });
});

describe('articleQuickPrompts', () => {
  it('names the piece so the question stands alone', () => {
    const prompts = articleQuickPrompts('Twenty Points Apart');
    expect(prompts.length).toBeGreaterThan(2);
    // Every prompt carries the title, so Archy can resolve "this" even if the
    // page context is dropped on the wire.
    for (const p of prompts) expect(p.send).toContain('Twenty Points Apart');
  });

  it('still offers something useful with no title', () => {
    const prompts = articleQuickPrompts(null);
    expect(prompts.length).toBeGreaterThan(2);
    for (const p of prompts) {
      expect(typeof p.send).toBe('string');
      expect(p.send.length).toBeGreaterThan(10);
    }
  });

  it('offers nothing resembling a company overview', () => {
    // The whole point. A reader who just finished an essay is not asking what
    // the company does.
    const all = articleQuickPrompts('X').map((p) => p.send.toLowerCase()).join(' ');
    expect(all).not.toContain('what does archetype original do');
  });
});
