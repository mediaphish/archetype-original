/**
 * @jest-environment node
 *
 * Bart, 2026-10-22: "Every word on the website on all pages should have been
 * consumed by the corpus and used to train all AI systems." These hold the
 * pieces that make that true, so it cannot quietly come apart again.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('every public page is in the corpus', () => {
  test('each page on the public list has a corpus file', () => {
    const routes = read('scripts/lib/public-static-routes.mjs');
    const paths = [...routes.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
    const files = new Set(readdirSync(join(root, 'ao-knowledge-hq-kit/site-pages')));
    const skipped = new Set(['/culture-science/ali/dashboard']);
    for (const p of paths) {
      if (skipped.has(p)) continue;
      const slug = p === '/' ? 'site-page-home' : `site-page-${p.slice(1).replace(/\//g, '-')}`;
      expect(files.has(`${slug}.md`)).toBe(true);
    }
  });

  test('the corpus build reads the page files', () => {
    const build = read('scripts/build-knowledge.mjs');
    expect(build).toContain("const SITE_PAGES_DIR = 'ao-knowledge-hq-kit/site-pages'");
    expect(build).toContain("type: 'site-page'");
  });

  test('the automatic pre-render refreshes the page text and commits it', () => {
    const wf = read('.github/workflows/prerender.yml');
    expect(wf).toContain('node scripts/extract-site-pages.mjs');
    expect(wf).toContain('ao-knowledge-hq-kit/site-pages/');
    expect(wf).toContain('data/knowledge-full.json');
  });

  test('the nightly index re-reads a page when its words change', () => {
    const emb = read('lib/ao/corpusEmbeddings.js');
    expect(emb).toMatch(/'site-page'/);
    expect(emb).toContain("select('slug, updated_at')");
  });

  test('page text stays server side, not in the public file', () => {
    const pub = JSON.parse(read('public/knowledge.json'));
    expect(pub.docs.some((d) => d.type === 'site-page')).toBe(false);
    const full = JSON.parse(read('data/knowledge-full.json'));
    expect(full.docs.filter((d) => d.type === 'site-page').length).toBeGreaterThanOrEqual(29);
  });
});
