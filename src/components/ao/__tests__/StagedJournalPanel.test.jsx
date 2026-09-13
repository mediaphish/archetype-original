/**
 * The staged panel, rendered.
 *
 * The regression it guards: on the Cain post the newest image was present but
 * hidden below a rejected reference upload in a scrolling column, and Bart could
 * not tell it had generated. Here the Image tab opens by itself at the image
 * stage, shows exactly one candidate, and keeps uploads out of the way.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';

function mockStage({ stage = 'image', tab = 'image', imageUrl = null, approvals } = {}) {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      draft: { slug: 'the-cain-archetype', kind: 'journal', image_url: imageUrl },
      stage: {
        stage,
        tab,
        approvals: approvals || { brief: true, post: true, image: false, captions: false, schedule: false },
      },
    }),
  }));
}

const upload = { url: 'https://example.com/reference.jpg', addedAt: 1, manualUpload: true, label: 'your upload' };
const firstGen = { url: 'https://example.com/first.png', addedAt: 2, label: 'the-cain-archetype' };
const newestGen = { url: 'https://example.com/field.png', addedAt: 3, label: 'the-cain-archetype' };

afterEach(() => {
  delete global.fetch;
});

describe('StagedJournalPanel', () => {
  it('opens the Image tab by itself when the draft is at the image stage', async () => {
    mockStage();
    render(<StagedJournalPanel slug="the-cain-archetype" designImages={[firstGen]} renderPost={() => <p>post body</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByTestId('stage-tab-post')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('data-state', 'current');
  });

  it('shows only the newest candidate, never the upload, with its version', async () => {
    mockStage();
    render(
      <StagedJournalPanel
        slug="the-cain-archetype"
        designImages={[firstGen, upload, newestGen]}
        renderPost={() => <p>post body</p>}
      />
    );
    const img = await screen.findByTestId('image-current');
    expect(img).toHaveAttribute('src', newestGen.url);
    expect(screen.getByTestId('image-version-label')).toHaveTextContent('version 2 of 2');
    expect(screen.getAllByRole('img').some((i) => i.getAttribute('src') === upload.url)).toBe(false);
    expect(screen.getByTestId('image-uploads-toggle')).toHaveTextContent('your uploads (1)');
  });

  it('keeps the Post tab open when Bart clicks it and the stage has not moved', async () => {
    mockStage();
    const { rerender } = render(
      <StagedJournalPanel slug="the-cain-archetype" designImages={[firstGen]} renderPost={() => <p>post body</p>} />
    );
    await waitFor(() => expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true'));

    fireEvent.click(screen.getByTestId('stage-tab-post'));
    expect(screen.getByText('post body')).toBeInTheDocument();

    // A refetch returning the same stage (triggered by a refresh) must not pull him back.
    rerender(
      <StagedJournalPanel
        slug="the-cain-archetype"
        designImages={[firstGen]}
        refreshKey={1}
        renderPost={() => <p>post body</p>}
      />
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('stage-tab-post')).toHaveAttribute('aria-selected', 'true');
  });

  it('marks the Image tab when a new image arrives while Bart is reading the post', async () => {
    mockStage();
    const { rerender } = render(
      <StagedJournalPanel slug="the-cain-archetype" designImages={[firstGen]} renderPost={() => <p>post body</p>} />
    );
    await waitFor(() => expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(screen.getByTestId('stage-tab-post'));

    rerender(
      <StagedJournalPanel slug="the-cain-archetype" designImages={[firstGen, newestGen]} renderPost={() => <p>post body</p>} />
    );
    // Nothing changes silently, and nothing yanks him off what he is reading.
    await screen.findByTestId('stage-tab-unread-image');
    expect(screen.getByTestId('stage-tab-post')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the plain post with no tabs when the server has no such draft', async () => {
    // The slug may have been derived from the artifact label, which is a guess.
    // An unconfirmed slug must not produce tabs claiming a stage.
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({ ok: false }) }));
    render(<StagedJournalPanel slug="not-a-real-draft" designImages={[]} renderPost={() => <p>post body</p>} />);
    expect(await screen.findByText('post body')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByTestId('staged-journal-fallback')).toBeInTheDocument();
  });

  it('falls back to the Post tab if the stage cannot be loaded', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ ok: false }) }));
    render(<StagedJournalPanel slug="x" designImages={[]} renderPost={() => <p>post body</p>} />);
    expect(await screen.findByText('post body')).toBeInTheDocument();
  });
});
