/**
 * The Post tab falls back to the saved draft when the artifact is a stub.
 *
 * 2026-09-20, "The Org Chart Only Works Until It's Tested": Auto wrote
 * "(same content as above)" into the artifact block after an editorial pass.
 * The panel showed that text as the post, with a word count of 4, while the
 * approved 1,274-word draft sat saved and unseen.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';
import { countDraftWords } from '../../../../lib/ao/draftStats.js';

const SAVED = `# The Org Chart Only Works Until It's Tested\n\n${'Interactive EQ ran more than 5,000 role-based simulations. '.repeat(12)}`;

function mockDraft(content) {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      draft: { slug: 'the-org-chart-only-works-until-its-tested', kind: 'journal', content },
      stage: { stage: 'post', tab: 'post', approvals: { brief: true, post: false, image: false, captions: false, schedule: false } },
      panel: null,
    }),
  }));
}

afterEach(() => {
  delete global.fetch;
});

it('renders the saved draft, and counts it, when the artifact says "(same content as above)"', async () => {
  mockDraft(SAVED);
  render(
    <StagedJournalPanel
      slug="the-org-chart-only-works-until-its-tested"
      postContent="(same content as above)"
      renderPost={(override) => <p data-testid="post-body">{override || '(same content as above)'}</p>}
    />
  );
  await waitFor(() => expect(screen.getByTestId('post-body')).toHaveTextContent('Interactive EQ ran more than 5,000'));
  expect(screen.getByTestId('stage-tab-post')).toHaveTextContent(`Post (${countDraftWords(SAVED)})`);
});

it('leaves a real artifact body alone', async () => {
  mockDraft(SAVED);
  const real = `# Title\n\n${'Real chat body. '.repeat(30)}`;
  render(
    <StagedJournalPanel
      slug="the-org-chart-only-works-until-its-tested"
      postContent={real}
      renderPost={(override) => <p data-testid="post-body">{override || real}</p>}
    />
  );
  await waitFor(() => expect(screen.getByTestId('post-body')).toHaveTextContent('Real chat body'));
});
