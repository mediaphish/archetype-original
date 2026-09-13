/**
 * The Captions and Schedule & Publish tabs, rendered.
 *
 * They shipped as placeholders and read as broken on the Cain post: a check
 * mark on Captions over "will show here", while five captions were scheduled
 * for the next day.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';

const captions = [
  { key: 'linkedin_personal', label: 'LinkedIn Personal', manual: false, text: 'LinkedIn Personal caption', chars: 25, source: 'scheduled' },
  { key: 'linkedin_business', label: 'LinkedIn Business', manual: true, text: 'LinkedIn Business caption', chars: 25, source: 'captions_draft' },
  { key: 'facebook_business', label: 'Facebook Business', manual: false, text: null, chars: 0, source: null },
  { key: 'facebook_personal', label: 'Facebook Personal', manual: true, text: 'Facebook Personal caption', chars: 25, source: 'captions_draft' },
  { key: 'instagram_business', label: 'Instagram Business', manual: false, text: 'IG business', chars: 11, source: 'scheduled' },
  { key: 'instagram_personal', label: 'Instagram Personal', manual: false, text: 'IG personal', chars: 11, source: 'scheduled' },
  { key: 'twitter', label: 'X', manual: false, text: 'X caption', chars: 9, source: 'scheduled' },
];

function schedule(manualPosts = {}) {
  return {
    publishAt: '2026-09-14T11:00:00+00:00',
    publishedAt: null,
    rows: [
      { key: 'linkedin_personal', label: 'LinkedIn Personal', platform: 'linkedin', scheduledAt: '2026-09-14T15:30:00+00:00', status: 'scheduled', hasImage: true },
      { key: 'twitter', label: 'X', platform: 'twitter', scheduledAt: '2026-09-14T15:30:00+00:00', status: 'scheduled', hasImage: true },
    ],
    manual: [
      { key: 'linkedin_business', label: 'LinkedIn Business', text: 'LinkedIn Business caption', imageUrl: 'https://example.com/cain.png', postedAt: manualPosts.linkedin_business || null },
      { key: 'facebook_personal', label: 'Facebook Personal', text: 'Facebook Personal caption', imageUrl: 'https://example.com/cain.png', postedAt: null },
    ],
  };
}

function mockServer({ stageTab = 'schedule_publish' } = {}) {
  let posted = {};
  global.fetch = jest.fn(async (url, opts) => {
    if (String(url).includes('/api/ao/auto/manual-post')) {
      const body = JSON.parse(opts.body);
      if (body.posted) posted = { ...posted, [body.channel]: '2026-09-14T16:00:00Z' };
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        draft: { slug: 'the-cain-archetype', kind: 'journal', image_url: 'https://example.com/cain.png' },
        stage: {
          stage: stageTab === 'captions' ? 'captions' : 'schedule',
          tab: stageTab,
          approvals: { brief: true, post: true, image: true, captions: true, schedule: stageTab !== 'captions' },
        },
        panel: { captions, schedule: schedule(posted) },
      }),
    };
  });
}

afterEach(() => {
  delete global.fetch;
});

const renderPanel = () =>
  render(<StagedJournalPanel slug="the-cain-archetype" designImages={[]} renderPost={() => <p>post body</p>} />);

describe('Captions tab', () => {
  it('shows every channel, marks manual ones, and says plainly when one has no caption', async () => {
    mockServer({ stageTab: 'captions' });
    renderPanel();
    await screen.findByTestId('captions-tab');
    for (const c of captions) expect(screen.getByTestId(`caption-${c.key}`)).toBeInTheDocument();
    expect(screen.getByTestId('caption-linkedin_business')).toHaveTextContent('posted by hand');
    expect(screen.getByTestId('caption-facebook_business')).toHaveTextContent('No caption for this channel yet.');
    expect(screen.getByTestId('caption-twitter')).toHaveTextContent('X caption');
  });
});

describe('Schedule & Publish tab', () => {
  it('shows the scheduled posts and the two posted by hand', async () => {
    mockServer();
    renderPanel();
    await screen.findByTestId('schedule-tab');
    expect(screen.getByTestId('schedule-row-linkedin_personal')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-row-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('manual-linkedin_business')).toBeInTheDocument();
    expect(screen.getByTestId('manual-facebook_personal')).toBeInTheDocument();
  });

  it('marks a manual post as done and shows it after saving', async () => {
    mockServer();
    renderPanel();
    fireEvent.click(await screen.findByTestId('mark-posted-linkedin_business'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ao/auto/manual-post',
        expect.objectContaining({ method: 'POST' })
      )
    );
    const postCall = global.fetch.mock.calls.find(([u]) => String(u).includes('manual-post'));
    expect(JSON.parse(postCall[1].body)).toEqual({ slug: 'the-cain-archetype', channel: 'linkedin_business', posted: true });

    // The panel refetches and reflects what the server saved.
    await waitFor(() => expect(screen.getByTestId('manual-linkedin_business')).toHaveTextContent('Posted'));
    expect(screen.getByTestId('mark-posted-facebook_personal')).toBeInTheDocument();
  });
});
