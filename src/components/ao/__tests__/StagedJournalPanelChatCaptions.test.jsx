/**
 * Captions that exist only in chat show in the Captions tab.
 *
 * "Your Tuesday", 2026-09-15: seven captions sat in a chat message and the tab
 * said "No captions yet", because it only read scheduled rows and a saved
 * captions draft.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';

const CHAT = `**LinkedIn Personal:**
Nick Saban told a reporter his morning routine once.
https://archetypeoriginal.com/journal/your-tuesday
#Leadership

**X:**
Saban gave himself 24 hours to feel anything about a result.
#Leadership

Want me to schedule these?`;

function mockCaptionsStage() {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      draft: { slug: 'your-tuesday', kind: 'journal', image_url: 'https://example.com/t.png' },
      stage: {
        stage: 'captions',
        tab: 'captions',
        approvals: { brief: true, post: true, image: true, captions: false, schedule: false },
      },
      // What the server sends before anything is saved or scheduled: every channel empty.
      panel: {
        captions: [
          'linkedin_personal', 'linkedin_business', 'facebook_business', 'facebook_personal',
          'instagram_business', 'instagram_personal', 'twitter',
        ].map((key) => ({ key, label: key, manual: key.endsWith('business') && key.startsWith('linkedin'), text: null, chars: 0, source: null })),
        schedule: { publishAt: null, publishedAt: null, rows: [], manual: [] },
      },
    }),
  }));
}

afterEach(() => {
  delete global.fetch;
});

describe('Captions tab with captions only in chat', () => {
  it('shows the chat captions and labels them as not scheduled', async () => {
    mockCaptionsStage();
    render(
      <StagedJournalPanel slug="your-tuesday" chatCaptionsText={CHAT} renderPost={() => <p>post</p>} />
    );
    await screen.findByTestId('captions-tab');
    expect(screen.getByTestId('caption-linkedin_personal')).toHaveTextContent('Nick Saban told a reporter');
    expect(screen.getByTestId('caption-chat-linkedin_personal')).toHaveTextContent('in chat, not scheduled');
    expect(screen.getByTestId('caption-twitter')).toHaveTextContent('Saban gave himself 24 hours');
    expect(screen.getByTestId('caption-twitter')).not.toHaveTextContent('Want me to schedule');
  });

  it('still says there are no captions when the chat has none either', async () => {
    mockCaptionsStage();
    render(<StagedJournalPanel slug="your-tuesday" chatCaptionsText={null} renderPost={() => <p>post</p>} />);
    expect(await screen.findByText('No captions yet')).toBeInTheDocument();
  });
});
