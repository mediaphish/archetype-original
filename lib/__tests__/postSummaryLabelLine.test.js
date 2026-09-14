/**
 * @jest-environment node
 *
 * A series label line must not run into the summary.
 *
 * The Cain Archetype published 2026-09-14 with the summary "The Archetype
 * Series, Entry Ten Cain did not fail because no one told him...", because the
 * italic subtitle lost its line break when markdown was flattened.
 */
import { summaryFromContent } from '../ao/postSummary.js';

const CAIN_OPENING = `*The Archetype Series, Entry Ten*

Cain did not fail because no one told him. He failed after being told, in words that named the exact danger and the exact way out of it.

That distinguishes him from almost everyone else this series has examined. Saul drifted. Absalom exploited a gap his father left open. Judas took before anyone knew he was taking.`;

describe('summaryFromContent with a label line', () => {
  it('drops the italic series label instead of merging it into the first sentence', () => {
    const s = summaryFromContent(CAIN_OPENING);
    expect(s.startsWith('Cain did not fail because no one told him.')).toBe(true);
    expect(s).not.toContain('Entry Ten Cain');
    expect(s).not.toContain('The Archetype Series');
  });

  it('drops a bold label the same way', () => {
    const s = summaryFromContent(`**THE SAUL ARCHETYPE**\n\nSaul was chosen before he was ready. ${'He kept the crown and lost the kingdom. '.repeat(10)}`);
    expect(s.startsWith('Saul was chosen before he was ready.')).toBe(true);
  });

  it('keeps a fully italic sentence, which is prose rather than a label', () => {
    const s = summaryFromContent(`*This one was hard to write.*\n\n${'The rest of the post continues here in plain prose. '.repeat(8)}`);
    expect(s.startsWith('This one was hard to write.')).toBe(true);
  });

  it('leaves ordinary emphasis inside a sentence alone', () => {
    const s = summaryFromContent('Leaders do not *decide* culture, they reveal it. That is the whole argument.');
    expect(s).toBe('Leaders do not decide culture, they reveal it. That is the whole argument.');
  });
});
