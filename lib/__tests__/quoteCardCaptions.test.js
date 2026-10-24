/**
 * @jest-environment node
 *
 * 2026-10-24: the first batch of quote cards that scheduled itself carried the
 * stand-in caption on all 25 posts ("A line worth sitting with ... this note is
 * context only"). No stand-in caption exists now, and anything queued with one
 * is found and rewritten before it posts.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../ao/textModel.js', () => ({ completeJson: jest.fn(async () => null), textModelConfigured: () => false }));
jest.mock('../ao/quoteCardImageUrl.js', () => ({}));
jest.mock('../ao/seedWeeklyCorpusPullBundle.js', () => ({}));
jest.mock('../ao/brandLogos.js', () => ({}));
jest.mock('../ao/remoteAssetDataUrl.js', () => ({}));

import { postNeedsNewCaption } from '../ao/autoQuoteCards.js';
import { captionIsUsable } from '../ao/scheduleWeeklyBundle.js';
import { generatePullQuoteCaptionsForQuotes } from '../ao/pullQuoteCaptions.js';

describe('quote card captions', () => {
  test('the old stand-in captions are caught on queued posts', () => {
    expect(postNeedsNewCaption('A line worth sitting with, from Why Servant Leadership Disrupts Unaccountable Power. The image shows the quote; this note is context only.')).toBe(true);
    expect(postNeedsNewCaption('Context for the line on the image: interpretation, not a shortened quote.\n\nTitle · https://x')).toBe(true);
    expect(postNeedsNewCaption('')).toBe(true);
  });

  test('a real caption passes', () => {
    const real = 'Most leaders hear the good news. The question is whether the bad news can reach you before it costs someone their job.';
    expect(postNeedsNewCaption(real)).toBe(false);
    expect(captionIsUsable(real)).toBe(true);
  });

  test('a caption with a banned phrase is not usable', () => {
    expect(captionIsUsable('Something to sit with this week.')).toBe(false);
  });

  test('without a text model, captions come back empty, never a stand-in', async () => {
    const out = await generatePullQuoteCaptionsForQuotes([{ quote: 'Authority must be earned.', source_title: 'T' }]);
    expect(out.ok).toBe(false);
    expect(out.captions).toEqual(['']);
    expect(out.captions_x).toEqual(['']);
  });
});
