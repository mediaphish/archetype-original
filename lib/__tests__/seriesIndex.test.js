/**
 * @jest-environment node
 *
 * Series membership had no queryable home.
 *
 * It existed only inside the title string and the slug, so nothing could look up
 * what series a post belonged to. Auto did what a language model does with a
 * gap: it produced something plausible, and called the Saban arc "the leadership
 * series". The drafts table was the only place structured series data lived, and
 * it was missing 81 of 98 published posts, with the four parts of that one arc
 * filed under three different series slugs.
 *
 * `series`, `series_name` and `series_part` are frontmatter fields now, carried
 * through the corpus build. These tests read the corpus directly, so they fail
 * if the frontmatter is dropped, if the build stops carrying it, or if a series
 * loses a part.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const JOURNAL = path.join(process.cwd(), 'ao-knowledge-hq-kit/journal');

function publishedPosts() {
  return fs
    .readdirSync(JOURNAL)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: f, ...matter(fs.readFileSync(path.join(JOURNAL, f), 'utf8')) }))
    .filter((p) => String(p.data?.status) === 'published');
}

const EXPECTED = {
  'transformational-leadership': 3,
  'power-vs-authority': 3,
  'the-7-conditions': 9,
  'psychology-of-servant-leadership': 6,
  'the-case-for-servant-leadership': 5,
  'clenched-fist-guiding-hand': 3,
};

describe('series frontmatter', () => {
  const posts = publishedPosts();

  it('parses every published post', () => {
    expect(posts.length).toBeGreaterThan(90);
  });

  it('has the expected number of parts in every series', () => {
    const counts = {};
    for (const p of posts) {
      if (!p.data.series) continue;
      counts[p.data.series] = (counts[p.data.series] || 0) + 1;
    }
    expect(counts).toEqual(EXPECTED);
  });

  it('numbers every series 1..n with no gaps or repeats', () => {
    // Power vs. Authority lost Parts 1 and 2 from the drafts table entirely and
    // nobody noticed until Bart said "Power and Authority had several posts."
    const bySeries = {};
    for (const p of posts) {
      if (!p.data.series) continue;
      (bySeries[p.data.series] ||= []).push(p.data.series_part);
    }
    for (const [series, parts] of Object.entries(bySeries)) {
      const sorted = [...parts].sort((a, b) => a - b);
      expect({ series, parts: sorted }).toEqual({
        series,
        parts: sorted.map((_, i) => i + 1),
      });
    }
  });

  it('gives every series post a name as well as a slug', () => {
    // The name is what Auto says out loud. Without it the slug gets read back
    // to Bart, or worse, invented.
    for (const p of posts) {
      if (!p.data.series) continue;
      expect(typeof p.data.series_name).toBe('string');
      expect(p.data.series_name.length).toBeGreaterThan(3);
    }
  });

  it('uses one consistent name per series slug', () => {
    const names = {};
    for (const p of posts) {
      if (!p.data.series) continue;
      names[p.data.series] ||= new Set();
      names[p.data.series].add(p.data.series_name);
    }
    for (const [series, set] of Object.entries(names)) {
      expect({ series, distinctNames: set.size }).toEqual({ series, distinctNames: 1 });
    }
  });

  it('never names a series after a single one of its posts', () => {
    // "Scoreboard Leadership" is Part 2's title. Calling the series that is the
    // mistake this whole exercise came from.
    const titles = new Set(posts.map((p) => String(p.data.title)));
    const seriesNames = new Set(posts.filter((p) => p.data.series).map((p) => p.data.series_name));
    for (const name of seriesNames) {
      expect(titles.has(name)).toBe(false);
    }
  });
});

describe('corpus build carries series through', () => {
  it('exposes series fields on knowledge.json entries', () => {
    // The build strips anything it does not explicitly copy, so frontmatter
    // alone is not enough. This is the step that makes it reach Auto.
    const p = path.join(process.cwd(), 'public/knowledge.json');
    if (!fs.existsSync(p)) return; // built artifact, not always present
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const docs = raw.documents || raw.docs || [];
    const withSeries = docs.filter((d) => d?.series);
    expect(withSeries.length).toBe(Object.values(EXPECTED).reduce((a, b) => a + b, 0));
    for (const d of withSeries) {
      expect(d.series_name).toBeTruthy();
      expect(typeof d.series_part).toBe('number');
    }
  });
});
