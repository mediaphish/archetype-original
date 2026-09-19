/**
 * @jest-environment node
 *
 * The example check's pure parts, on the 2026-09-19 case: Auto recommended
 * Mulally's Ford Edge meeting and Stumpf at Wells Fargo, both already published.
 */
import { parseExamples, mergeCandidates, parseFindings, formatExampleReuseNote } from '../ao/exampleReuse.js';

const items = [
  {
    example: { subject: 'Mark Fields / Alan Mulally, Ford', story: 'Fields shows a red chart on the Ford Edge launch and Mulally claps' },
    candidates: [
      { slug: 'unity-is-not-sameness', title: 'Unity Is Not Sameness', doc_type: 'journal-post', content: 'Mulally... the Ford Edge...' },
    ],
  },
  {
    example: { subject: 'John Stumpf, Wells Fargo', story: 'Stumpf pushes blame to low-level employees in the Senate hearing' },
    candidates: [
      { slug: 'scoreboard-leadership', title: 'Scoreboard Leadership', doc_type: 'journal-post', content: 'Eight is Great...' },
    ],
  },
];

describe('parseExamples', () => {
  it('keeps subject, story and usable search terms', () => {
    const out = parseExamples({
      examples: [{ subject: 'John Stumpf, Wells Fargo', story: 'Senate hearing', search_terms: ['Stumpf', 'WF', 'Wells Fargo'] }],
    });
    expect(out).toEqual([{ subject: 'John Stumpf, Wells Fargo', story: 'Senate hearing', search_terms: ['Stumpf', 'Wells Fargo'] }]);
  });

  it('returns nothing for malformed output', () => {
    expect(parseExamples(null)).toEqual([]);
    expect(parseExamples({ examples: [{ story: 'no subject' }] })).toEqual([]);
  });
});

describe('mergeCandidates', () => {
  it('drops duplicate passages from the exact and semantic searches', () => {
    const p = { slug: 'scoreboard-leadership', title: 'Scoreboard Leadership', content: 'Eight is Great, Stumpf...' };
    expect(mergeCandidates([[p], [p, { ...p, content: 'another passage' }]])).toHaveLength(2);
  });
});

describe('parseFindings', () => {
  it('reports the same story and the same subject in a different story', () => {
    const out = parseFindings(
      {
        findings: [
          { example: 1, verdict: 'same_story', slug: 'unity-is-not-sameness', note: 'the Ford Edge red chart meeting' },
          { example: 2, verdict: 'same_subject', slug: 'scoreboard-leadership', note: 'Eight is Great quotas' },
        ],
      },
      items
    );
    expect(out.map((f) => [f.verdict, f.url])).toEqual([
      ['same_story', '/journal/unity-is-not-sameness'],
      ['same_subject', '/journal/scoreboard-leadership'],
    ]);
  });

  it('ignores a cited slug that was never shown for that example', () => {
    expect(parseFindings({ findings: [{ example: 1, verdict: 'same_story', slug: 'made-up-post' }] }, items)).toEqual([]);
  });

  it('ignores not_used verdicts', () => {
    expect(parseFindings({ findings: [{ example: 1, verdict: 'not_used', slug: 'unity-is-not-sameness' }] }, items)).toEqual([]);
  });
});

describe('formatExampleReuseNote', () => {
  const findings = parseFindings(
    { findings: [{ example: 1, verdict: 'same_story', slug: 'unity-is-not-sameness', note: 'The Ford Edge red chart meeting' }] },
    items
  );

  it('names the example, the post and whether it is the same story', () => {
    const note = formatExampleReuseNote(findings, { corpusCheckedThisTurn: true });
    expect(note).toContain('**Corpus check on the examples above:**');
    expect(note).toContain('the same story is already in "Unity Is Not Sameness" (/journal/unity-is-not-sameness)');
    expect(note).not.toContain('without searching');
    expect(note).not.toMatch(/—/);
  });

  it('says so when the corpus was not searched before recommending', () => {
    expect(formatExampleReuseNote(findings, { corpusCheckedThisTurn: false })).toContain(
      'These were recommended without searching the corpus first.'
    );
  });

  it('adds nothing when no example was already used', () => {
    expect(formatExampleReuseNote([], {})).toBeNull();
  });
});
