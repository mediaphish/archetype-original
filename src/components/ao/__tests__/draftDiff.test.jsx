import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  buildDraftWordDiff,
  extractSlugFromDraftContent,
  formatVersionTimestamp,
} from '../draftDiff';

function DiffPreview({ prior, current }) {
  const parts = buildDraftWordDiff(prior, current);
  return (
    <div data-testid="draft-diff-body">
      {parts.map((part, i) => {
        if (part.type === 'added') {
          return (
            <span key={i} data-diff="added">
              {part.value}
            </span>
          );
        }
        if (part.type === 'removed') {
          return (
            <span key={i} data-diff="removed">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

describe('draftDiff helpers', () => {
  it('extracts slug from front matter', () => {
    const content = `---\ntitle: Hello\nslug: scoreboard-leadership-part-3\n---\n\nBody text.`;
    expect(extractSlugFromDraftContent(content)).toBe('scoreboard-leadership-part-3');
  });

  it('builds word-level insert/delete spans for a known before/after pair', () => {
    const prior = 'The coach held the line.';
    const current = 'The player coach held the standard.';
    const parts = buildDraftWordDiff(prior, current);
    const types = parts.map((p) => p.type);
    expect(types).toContain('added');
    expect(types).toContain('removed');
    expect(types).toContain('unchanged');

    render(<DiffPreview prior={prior} current={current} />);
    const body = screen.getByTestId('draft-diff-body');
    expect(body.querySelectorAll('[data-diff="added"]').length).toBeGreaterThan(0);
    expect(body.querySelectorAll('[data-diff="removed"]').length).toBeGreaterThan(0);
    expect(body.textContent).toMatch(/coach/);
  });

  it('formats version timestamps without throwing', () => {
    const label = formatVersionTimestamp('2026-08-13T23:10:56.000Z');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(3);
  });
});
