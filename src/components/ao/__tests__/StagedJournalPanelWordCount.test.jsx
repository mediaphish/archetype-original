/**
 * The Post tab shows a working word count: "Post (2,312)".
 *
 * It uses countDraftWords, the same measured count Auto reports, so the tab and
 * the chat cannot disagree about how long the post is.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';
import { countDraftWords } from '../../../../lib/ao/draftStats.js';

function mockStage() {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      draft: { slug: 'the-cain-archetype', kind: 'journal', image_url: null },
      stage: {
        stage: 'post',
        tab: 'post',
        approvals: { brief: true, post: false, image: false, captions: false, schedule: false },
      },
      panel: null,
    }),
  }));
}

afterEach(() => {
  delete global.fetch;
});

const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

describe('Post tab word count', () => {
  it('shows the count with a thousands separator', async () => {
    mockStage();
    const content = words(2312);
    expect(countDraftWords(content)).toBe(2312);
    render(<StagedJournalPanel slug="the-cain-archetype" postContent={content} renderPost={() => <p>post</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-post')).toHaveTextContent('Post (2,312)'));
  });

  it('recounts when the post is revised', async () => {
    mockStage();
    const { rerender } = render(
      <StagedJournalPanel slug="the-cain-archetype" postContent={words(900)} renderPost={() => <p>post</p>} />
    );
    await waitFor(() => expect(screen.getByTestId('stage-tab-post')).toHaveTextContent('Post (900)'));
    rerender(<StagedJournalPanel slug="the-cain-archetype" postContent={words(1105)} renderPost={() => <p>post</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-post')).toHaveTextContent('Post (1,105)'));
  });

  it('shows no count, rather than zero, when there is no post text', async () => {
    mockStage();
    render(<StagedJournalPanel slug="the-cain-archetype" postContent={null} renderPost={() => <p>post</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-post')).toBeInTheDocument());
    expect(screen.getByTestId('stage-tab-post')).not.toHaveTextContent('(');
  });

  it('puts the count on Post only', async () => {
    mockStage();
    render(<StagedJournalPanel slug="the-cain-archetype" postContent={words(50)} renderPost={() => <p>post</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-post')).toHaveTextContent('Post (50)'));
    expect(screen.getByTestId('stage-tab-image')).not.toHaveTextContent('(');
    expect(screen.getByTestId('stage-tab-captions')).not.toHaveTextContent('(');
  });
});
