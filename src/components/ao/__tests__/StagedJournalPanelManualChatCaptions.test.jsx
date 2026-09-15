/**
 * Manual channels get their captions from chat when the automated ones are scheduled.
 *
 * "Your Tuesday", 2026-09-15: five captions were scheduled and the two manual
 * channels (LinkedIn Business, Facebook Personal) sat only in Auto's chat
 * message. The Captions tab said "No caption for this channel yet" for both.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import StagedJournalPanel from '../StagedJournalPanel.jsx';
import { findChatCaptionsMessage } from '../../../../lib/ao/journalPanelData.js';

const MESSAGE = `Confirmed real state: all 5 automated channels are scheduled for Wednesday 9/16.

**LinkedIn Personal (currently missing the closer line — needs the fix):**
Nick Saban told a reporter his morning routine once.

Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #TransformationalLeadership

**X (as scheduled):**
Saban gave himself 24 hours to feel anything about a result. https://archetypeoriginal.com/journal/your-tuesday

#Leadership

**Facebook Business (as scheduled):**
Nick Saban's whole method, boiled down. Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership

**LinkedIn Business (manual paste):**
The organizations that hold a standard under pressure are rarely the ones with the best slogan. Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #OrganizationalCulture

**Facebook Personal (manual paste):**
Wrote something this week I actually lived, not just researched. Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #Reflection

Tell me plainly: do you want all seven rewritten from scratch?`;

const KEYS = [
  'linkedin_personal', 'linkedin_business', 'facebook_business', 'facebook_personal',
  'instagram_business', 'instagram_personal', 'twitter',
];
const MANUAL = new Set(['linkedin_business', 'facebook_personal']);

afterEach(() => {
  delete global.fetch;
});

it('fills the two manual channels from chat while the others show scheduled text', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      draft: { slug: 'your-tuesday', kind: 'journal', image_url: 'https://example.com/t.png' },
      stage: { stage: 'image', tab: 'image', approvals: { brief: true, post: true, image: false, captions: false, schedule: false } },
      panel: {
        captions: KEYS.map((key) => ({
          key,
          label: key,
          manual: MANUAL.has(key),
          text: MANUAL.has(key) ? null : `Scheduled ${key}`,
          chars: MANUAL.has(key) ? 0 : 10,
          source: MANUAL.has(key) ? null : 'scheduled',
        })),
        schedule: { publishAt: null, publishedAt: null, rows: [], manual: [] },
      },
    }),
  }));

  const chat = findChatCaptionsMessage(
    [{ role: 'assistant', content: MESSAGE }, { role: 'assistant', content: 'Got it, using the image you attached.' }],
    { slug: 'your-tuesday', title: 'Your Tuesday' }
  );
  render(<StagedJournalPanel slug="your-tuesday" chatCaptionsText={chat} renderPost={() => <p>post</p>} />);

  const { fireEvent, waitFor } = await import('@testing-library/react');
  await waitFor(() => expect(screen.getByTestId('stage-tab-captions')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('stage-tab-captions'));

  expect(await screen.findByTestId('caption-linkedin_business')).toHaveTextContent('The organizations that hold a standard');
  expect(screen.getByTestId('caption-facebook_personal')).toHaveTextContent('Wrote something this week');
  expect(screen.getByTestId('caption-facebook_business')).toHaveTextContent('Scheduled facebook_business');
});
