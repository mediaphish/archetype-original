/**
 * Approving each step, rendered.
 *
 * The regression: the panel treated a saved image as an approved one and moved
 * to Captions before Bart approved the image ("Your Tuesday", 2026-09-15).
 * Here the stage only moves after an approval is recorded.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';

const IMAGE = 'https://example.com/tuesday.png';

function stageResponse(stage, approvals) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      draft: { slug: 'your-tuesday', kind: 'journal', image_url: IMAGE },
      stage: { stage, tab: stage === 'image' ? 'image' : stage === 'captions' ? 'captions' : 'schedule_publish', approvals },
      panel: null,
    }),
  };
}

const CHAT = `**LinkedIn Personal:**
Nick Saban told a reporter his morning routine once.
https://archetypeoriginal.com/journal/your-tuesday
#Leadership

**X:**
Saban gave himself 24 hours.
#Leadership`;

afterEach(() => {
  delete global.fetch;
});

describe('Approve image', () => {
  it('records the approval, tells Auto, and only then moves to Captions', async () => {
    let approved = false;
    global.fetch = jest.fn(async (url, opts) => {
      if (String(url).includes('/api/ao/auto/approve-stage')) {
        approved = true;
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return approved
        ? stageResponse('captions', { brief: true, post: true, image: true, captions: false, schedule: false })
        : stageResponse('image', { brief: true, post: true, image: false, captions: false, schedule: false });
    });
    const onStageApproved = jest.fn();

    render(
      <StagedJournalPanel
        slug="your-tuesday"
        designImages={[{ url: IMAGE, addedAt: 1 }]}
        renderPost={() => <p>post</p>}
        onStageApproved={onStageApproved}
      />
    );

    // Sitting on Image with the image saved: not approved, not moved on.
    await waitFor(() => expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByTestId('stage-tab-captions')).toHaveAttribute('data-state', 'ahead');

    fireEvent.click(screen.getByTestId('approve-image'));

    await waitFor(() => expect(onStageApproved).toHaveBeenCalledWith('image'));
    const post = global.fetch.mock.calls.find(([u]) => String(u).includes('approve-stage'));
    expect(JSON.parse(post[1].body)).toEqual({ slug: 'your-tuesday', stage: 'image' });

    await waitFor(() => expect(screen.getByTestId('stage-tab-captions')).toHaveAttribute('aria-selected', 'true'));
  });

  it('offers no approval while viewing an older version that is not the saved image', async () => {
    // Approve records the image saved on the draft. If Bart is looking at an
    // earlier version, approving from that screen would approve a different
    // image than the one he is looking at, so the button is withheld.
    global.fetch = jest.fn(async () =>
      stageResponse('image', { brief: true, post: true, image: false, captions: false, schedule: false })
    );
    render(
      <StagedJournalPanel
        slug="your-tuesday"
        designImages={[
          { url: 'https://example.com/older.png', addedAt: 1 },
          { url: IMAGE, addedAt: 2 },
        ]}
        renderPost={() => <p>post</p>}
      />
    );
    await waitFor(() => expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByTestId('approve-image')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('image-previous-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /View version 1/ }));

    expect(screen.queryByTestId('approve-image')).toBeNull();
    expect(screen.getByText(/not the image saved on the draft/)).toBeInTheDocument();
  });

  it('shows the error and does not move on when the server refuses', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('approve-stage')) {
        return { ok: false, status: 409, json: async () => ({ ok: false, error: 'Approve the post before the image.' }) };
      }
      return stageResponse('image', { brief: true, post: true, image: false, captions: false, schedule: false });
    });
    render(<StagedJournalPanel slug="your-tuesday" designImages={[{ url: IMAGE, addedAt: 1 }]} renderPost={() => <p>post</p>} />);
    fireEvent.click(await screen.findByTestId('approve-image'));
    expect(await screen.findByText('Approve the post before the image.')).toBeInTheDocument();
    expect(screen.getByTestId('stage-tab-image')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Approve captions', () => {
  it('sends exactly the captions shown and tells Auto', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('approve-stage')) return { ok: true, status: 200, json: async () => ({ ok: true }) };
      return stageResponse('captions', { brief: true, post: true, image: true, captions: false, schedule: false });
    });
    const onStageApproved = jest.fn();
    render(
      <StagedJournalPanel
        slug="your-tuesday"
        chatCaptionsText={CHAT}
        renderPost={() => <p>post</p>}
        onStageApproved={onStageApproved}
      />
    );
    fireEvent.click(await screen.findByTestId('approve-captions'));
    await waitFor(() => expect(onStageApproved).toHaveBeenCalledWith('captions'));
    const post = global.fetch.mock.calls.find(([u]) => String(u).includes('approve-stage'));
    const body = JSON.parse(post[1].body);
    expect(body.stage).toBe('captions');
    expect(body.captions.linkedin_personal).toMatch(/^Nick Saban told a reporter/);
    expect(body.captions.twitter).toMatch(/^Saban gave himself/);
  });

  it('shows captions as approved and offers no button once approved', async () => {
    global.fetch = jest.fn(async () =>
      stageResponse('schedule', { brief: true, post: true, image: true, captions: true, schedule: false })
    );
    render(<StagedJournalPanel slug="your-tuesday" chatCaptionsText={CHAT} renderPost={() => <p>post</p>} />);
    await waitFor(() => expect(screen.getByTestId('stage-tab-schedule_publish')).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(screen.getByTestId('stage-tab-captions'));
    expect(await screen.findByTestId('captions-approved')).toBeInTheDocument();
    expect(screen.queryByTestId('approve-captions')).toBeNull();
  });
});
