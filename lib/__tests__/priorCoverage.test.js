/**
 * @jest-environment node
 *
 * Checking a new pitch against what Bart has already published.
 *
 * 2026-09-15: Auto pitched "The Gap That Won't Close", a rerun of "Twenty Points
 * Apart" (published 2026-08-28) with a new statistic, and saved it as a draft.
 * Similarities below are the values measured that day with the real search.
 */
import { selectPriorCoverage, priorCoverageGateResult, PRIOR_COVERAGE_THRESHOLD } from '../ao/priorCoverage.js';

const doc = (slug, similarity, doc_type = 'journal-post') => ({
  slug,
  title: slug,
  doc_type,
  similarity,
  passages: [{ content: `passage from ${slug}` }],
});

describe('selectPriorCoverage', () => {
  it('flags the Gap pitch against Twenty Points Apart, with its publish date', () => {
    const out = selectPriorCoverage(
      [doc('twenty-points-apart', 0.693), doc('chapter-12-do-the-work', 0.675, 'chapter')],
      {
        slug: 'the-gap-that-wont-close',
        publishedBySlug: { 'twenty-points-apart': { series_slug: 'twenty-points-apart', published_at: '2026-08-28T11:01:26Z' } },
      }
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ slug: 'twenty-points-apart', url: '/journal/twenty-points-apart', published_at: '2026-08-28T11:01:26Z' });
  });

  it('lets a resurface with its own argument through (0.526 measured)', () => {
    expect(selectPriorCoverage([doc('scoreboard-leadership', 0.526)], { slug: 'new-one' })).toEqual([]);
  });

  it('does not count parts of the same series against each other (0.672 measured)', () => {
    const out = selectPriorCoverage([doc('they-still-call-him', 0.672)], {
      slug: 'your-tuesday',
      seriesSlug: 'transformational-leadership',
      publishedBySlug: { 'they-still-call-him': { series_slug: 'transformational-leadership' } },
    });
    expect(out).toEqual([]);
  });

  it('never matches the draft itself or prior parts already loaded', () => {
    expect(
      selectPriorCoverage([doc('the-cain-archetype', 0.9), doc('the-saul-archetype', 0.8)], {
        slug: 'the-cain-archetype',
        excludeSlugs: ['the-saul-archetype'],
      })
    ).toEqual([]);
  });

  it('ignores books, chapters and articles, which a resurface builds on by design', () => {
    expect(selectPriorCoverage([doc('fundamentals-trust-is-the-currency', 0.8, 'article')], {})).toEqual([]);
  });

  it('keeps the threshold between the measured duplicates and the measured new pitches', () => {
    expect(PRIOR_COVERAGE_THRESHOLD).toBeGreaterThan(0.527);
    expect(PRIOR_COVERAGE_THRESHOLD).toBeLessThan(0.672);
  });
});

describe('priorCoverageGateResult', () => {
  it('refuses the save, names the post and date, and says how to proceed', () => {
    const r = priorCoverageGateResult([
      { slug: 'twenty-points-apart', title: 'Twenty Points Apart', url: '/journal/twenty-points-apart', similarity: 0.693, published_at: '2026-08-28T11:01:26Z' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.gate).toBe('prior_coverage');
    expect(r.error).toContain('NOT SAVED');
    expect(r.error).toContain('"Twenty Points Apart" (/journal/twenty-points-apart, published 2026-08-28)');
    expect(r.error).toContain('prior_coverage_cleared=true');
    expect(r.error).not.toMatch(/—/);
  });
});
