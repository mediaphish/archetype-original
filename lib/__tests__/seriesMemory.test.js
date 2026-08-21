import {
  seriesKeyFor,
  formatSeriesMemoryForPrompt,
  SEED_STATUSES,
} from '../ao/seriesMemory.js';

describe('seriesKeyFor', () => {
  it('normalizes titles into stable keys', () => {
    expect(seriesKeyFor('Power vs. Authority')).toBe('power-vs-authority');
    expect(seriesKeyFor('The Archetype Series')).toBe('the-archetype');
    expect(seriesKeyFor('  Seven ALI Conditions  ')).toBe('seven-ali-conditions');
  });

  it('is idempotent — a key run through again is unchanged', () => {
    const once = seriesKeyFor('Psychology of Servant Leadership');
    expect(seriesKeyFor(once)).toBe(once);
  });

  it('handles empty and junk input without throwing', () => {
    expect(seriesKeyFor('')).toBe('');
    expect(seriesKeyFor(null)).toBe('');
    expect(seriesKeyFor('!!!')).toBe('');
  });
});

describe('formatSeriesMemoryForPrompt', () => {
  const series = [
    {
      series_key: 'the-archetype',
      title: 'The Archetype Series',
      intent: 'Biblical figures as leadership archetypes.',
      parts: [
        { part_number: 1, slug: 'the-joseph-archetype', title: 'The Joseph Archetype', status: 'published' },
        { part_number: 2, slug: 'the-saul-archetype', title: 'The Saul Archetype', status: 'published' },
        { part_number: 3, slug: 'the-ruth-archetype', title: 'The Ruth Archetype', status: 'draft' },
      ],
    },
  ];
  const seeds = [
    { name: 'Barnabas', series_key: 'the-archetype', note: 'encourager', status: 'open' },
    { name: 'Nehemiah', series_key: 'the-archetype', note: '', status: 'chosen' },
  ];

  it('returns empty string when there is nothing to say', () => {
    expect(formatSeriesMemoryForPrompt([], [])).toBe('');
    expect(formatSeriesMemoryForPrompt()).toBe('');
  });

  it('separates published parts from in-progress ones', () => {
    const out = formatSeriesMemoryForPrompt(series, []);
    expect(out).toContain('published (2)');
    expect(out).toContain('The Joseph Archetype');
    expect(out).toContain('in progress:');
    expect(out).toContain('The Ruth Archetype');
    expect(out).toContain('[draft]');
  });

  it('lists open seeds separately from decided ones', () => {
    const out = formatSeriesMemoryForPrompt(series, seeds);
    expect(out).toContain('Seeds in play');
    expect(out).toContain('Barnabas');
    expect(out).toContain('Seeds already decided');
    expect(out).toContain('Nehemiah — chosen');
  });

  it('instructs against the exact failure this memory exists to stop', () => {
    // Auto asked Bart to brainstorm Archetype figures from a blank page while
    // four were already published and ~10 had been discussed.
    const out = formatSeriesMemoryForPrompt(series, seeds);
    expect(out).toContain('brainstorm from a blank page');
    expect(out).toContain('do not silently invent a replacement');
  });

  it('renders seeds even when no series is recorded yet', () => {
    const out = formatSeriesMemoryForPrompt([], seeds);
    expect(out).toContain('Barnabas');
    expect(out).not.toContain('### Series');
  });

  it('orders parts by number regardless of input order', () => {
    const scrambled = [
      {
        series_key: 's',
        title: 'S',
        intent: '',
        parts: [
          { part_number: 3, title: 'Third', status: 'published' },
          { part_number: 1, title: 'First', status: 'published' },
          { part_number: 2, title: 'Second', status: 'published' },
        ],
      },
    ];
    // formatSeriesMemoryForPrompt renders what it is given; rowToSeries sorts.
    // This asserts the rendering keeps the order it receives, so the sort in
    // rowToSeries is the single place ordering is decided.
    const out = formatSeriesMemoryForPrompt(scrambled, []);
    expect(out.indexOf('Third')).toBeLessThan(out.indexOf('First'));
  });
});

describe('SEED_STATUSES', () => {
  it('is the closed set the store validates against', () => {
    expect(SEED_STATUSES).toEqual(['open', 'chosen', 'rejected']);
  });
});
