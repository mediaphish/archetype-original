/**
 * @jest-environment node
 *
 * The truncated summary that took the site's publishing down (2026-09-21).
 */
import { repairSummaryForPublish } from '../ao/publishSummaryGuard.js';
import { isTruncatedSummary } from '../ao/postSummary.js';
import { readFrontMatterSummary, replaceFrontMatterSummary, readBody } from '../ao/postFrontMatter.js';

const BROKEN =
  "Interactive EQ ran more than 5,000 role-based workplace simulations across 1,700-plus professionals in 46 organizations this year and published the results as the Behavioral Intelligence Index. The finding that matters isn't complicated. About one in four professionals stall when";

const BODY = `# The Org Chart Only Works Until It's Tested\n\nInteractive EQ ran more than 5,000 role-based workplace simulations. About one in four professionals stall when authority becomes ambiguous, even when they already know the right thing to do.\n`;

describe('repairSummaryForPublish', () => {
  it('keeps the whole sentences Bart already had', () => {
    const out = repairSummaryForPublish({ summary: BROKEN, content: BODY });
    expect(out.repaired).toBe(true);
    expect(out.summary.endsWith("The finding that matters isn't complicated.")).toBe(true);
    expect(isTruncatedSummary(out.summary)).toBeFalsy();
  });

  it('rebuilds from the post when there is no whole sentence to keep', () => {
    const out = repairSummaryForPublish({ summary: 'About one in four professionals stall when', content: BODY });
    expect(out.repaired).toBe(true);
    expect(isTruncatedSummary(out.summary)).toBeFalsy();
  });

  it('leaves a good summary alone', () => {
    const good = 'Authority only proves itself when the stakes turn personal and the lines go blurry at once.';
    expect(repairSummaryForPublish({ summary: good, content: BODY })).toEqual({
      summary: good,
      repaired: false,
      reason: null,
    });
  });

  it('fills an empty summary from the post', () => {
    const out = repairSummaryForPublish({ summary: '', content: BODY });
    expect(out.repaired).toBe(true);
    expect(out.summary.length).toBeGreaterThan(20);
  });
});

describe('front matter', () => {
  const file = `---\ntitle: The Org Chart Only Works Until It's Tested\nslug: the-org-chart-only-works-until-its-tested\nsummary: >-\n  ${BROKEN}\ncategories:\n  - Leadership\nstatus: published\n---\n\n${BODY}`;

  it('reads a folded summary back', () => {
    expect(readFrontMatterSummary(file)).toBe(BROKEN);
  });

  it('replaces it without disturbing the rest of the front matter or the body', () => {
    const fixed = replaceFrontMatterSummary(file, 'A complete sentence about authority under pressure.');
    expect(readFrontMatterSummary(fixed)).toBe('A complete sentence about authority under pressure.');
    expect(fixed).toContain('slug: the-org-chart-only-works-until-its-tested');
    expect(fixed).toContain('status: published');
    expect(readBody(fixed).trim()).toBe(BODY.trim());
  });

  it('handles an inline summary too', () => {
    const inline = `---\ntitle: X\nsummary: "Cut off here and"\n---\n\nBody.`;
    expect(readFrontMatterSummary(inline)).toBe('Cut off here and');
    expect(readFrontMatterSummary(replaceFrontMatterSummary(inline, 'Whole sentence now.'))).toBe('Whole sentence now.');
  });
});
