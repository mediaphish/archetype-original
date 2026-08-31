/**
 * @jest-environment node
 *
 * The pages themselves, not just the hook.
 *
 * useLocationPathname is correct and tested, but the bug was that three detail
 * pages each captured the slug once at mount. A passing hook test proves
 * nothing if a page stops using it, so this asserts the pages are actually
 * wired: no mount-time pathname read, and the URL present in the dependency
 * array of the effect that loads content.
 *
 * Reproduced on the live site 2026-08-30: clicking a Related Journal Posts link
 * from Part 2 to Part 1 changed the URL and left Part 2 rendered.
 */
import fs from 'fs';
import path from 'path';

const PAGES = [
  'src/pages/JournalPost.jsx',
  'src/pages/DevotionalPost.jsx',
  'src/pages/PodcastEpisode.jsx',
];

describe.each(PAGES)('%s', (rel) => {
  const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

  it('does not read window.location.pathname directly', () => {
    // This is the exact line that froze the slug at mount. The pathname has to
    // come through state so it can be a dependency.
    expect(src).not.toMatch(/const path = window\.location\.pathname/);
  });

  it('uses the pathname hook', () => {
    expect(src).toMatch(/useLocationPathname/);
    expect(src).toMatch(/const pathname = useLocationPathname\(\)/);
  });

  it('lists pathname in the content-loading dependency array', () => {
    // An empty dependency array on the effect that resolves the slug is the
    // defect. Any array that includes pathname is fine.
    const deps = src.match(/\}, \[[^\]]*\]\);/g) || [];
    expect(deps.some((d) => d.includes('pathname'))).toBe(true);
  });

  it('has no effect that both resolves a slug and depends on nothing', () => {
    // Guards the specific shape rather than the specific file. An effect body
    // that derives a slug must not end in an empty dependency array.
    const effects = src.split(/useEffect\(\(\) => \{/).slice(1);
    for (const body of effects) {
      const end = body.indexOf('});');
      const chunk = end === -1 ? body : body.slice(0, end + 3);
      if (!/replace\('\/journal\/'|replace\('\/podcast\/'|replace\('\/devotional\/'/.test(chunk)) continue;
      expect(chunk).not.toMatch(/\}, \[\]\);\s*$/);
    }
  });
});
