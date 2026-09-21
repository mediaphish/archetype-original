/**
 * @jest-environment node
 *
 * Naming why a published post is not live (2026-09-21).
 */
import { diagnoseMarkdown } from '../ao/publishHealth.js';

const file = (summary, body = 'Real body text for the post.') =>
  `---\ntitle: The Org Chart Only Works Until It's Tested\nslug: the-org-chart-only-works-until-its-tested\nsummary: >-\n  ${summary}\nstatus: published\n---\n\n${body}\n`;

describe('diagnoseMarkdown', () => {
  it('names the truncated summary that stopped the build, and marks it repairable', () => {
    const problems = diagnoseMarkdown(file('About one in four professionals stall when'));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ check: 'verify-post-summaries', blocking: true, repairable: true });
    expect(problems[0].detail).toMatch(/looks cut off/);
  });

  it('finds nothing wrong with a good post', () => {
    expect(diagnoseMarkdown(file('Authority only proves itself when the stakes turn personal.'))).toEqual([]);
  });

  it('catches an empty body', () => {
    const problems = diagnoseMarkdown(file('A complete summary sentence.', ''));
    expect(problems.some((p) => p.check === 'body')).toBe(true);
  });

  it('catches a missing summary', () => {
    const noSummary = `---\ntitle: X\nslug: x\nstatus: published\n---\n\nBody.\n`;
    expect(diagnoseMarkdown(noSummary)[0]).toMatchObject({ check: 'verify-post-summaries', repairable: true });
  });
});
