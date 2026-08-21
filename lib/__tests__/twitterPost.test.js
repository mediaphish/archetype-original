/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

jest.mock('../social/config.js', () => ({
  getSocialCredentials: jest.fn(() => null), // no OAuth 1.0a keys configured
}));

jest.mock('../social/xConnection.js', () => ({
  getXAccessToken: jest.fn(async () => ({ ok: true, accessToken: 'test-oauth2-token' })),
}));

import { postToTwitter } from '../social/twitter.js';

const STORAGE_URL =
  'https://cejecqtftkzyulzrtksx.supabase.co/storage/v1/object/public/ao-auto-attachments/quote-card-123.png';

describe('postToTwitter', () => {
  let sentBodies;

  beforeEach(() => {
    sentBodies = [];
    global.fetch = jest.fn(async (_url, init) => {
      sentBodies.push(JSON.parse(init?.body || '{}'));
      return {
        ok: true,
        json: async () => ({ data: { id: '123' } }),
        headers: { get: () => 'application/json' },
      };
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('never posts a raw storage URL as tweet text', async () => {
    // What shipped on 2026-08-13: the quote, then
    // "cejecqtftkzyulzrtksx.supabase.co/storage/v1/obj…" as visible body text,
    // recorded as a successful post. trimmedUrl is the IMAGE, not an article
    // link, so appending it was never right for any post type.
    await postToTwitter({ text: 'Management is doing things right. Drucker.' });

    for (const body of sentBodies) {
      expect(body.text || '').not.toContain('supabase.co');
      expect(body.text || '').not.toContain('/storage/v1/');
    }
  });

  it('refuses to post at all when an image was intended but cannot be attached', async () => {
    // A quote card without its card is not the post. Failing loudly is what
    // surfaced this; silently posting text was what hid it for eight days.
    const result = await postToTwitter({
      text: 'Management is doing things right. Drucker.',
      imageUrl: STORAGE_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/media upload credentials are missing/i);
    expect(sentBodies).toHaveLength(0);
  });

  it('still posts a text-only tweet when no image was intended', async () => {
    const result = await postToTwitter({ text: 'A leader knows the way. Maxwell.' });
    expect(result.success).toBe(true);
    expect(sentBodies[0].text).toBe('A leader knows the way. Maxwell.');
  });

  it('truncates to the 280 character limit', async () => {
    await postToTwitter({ text: 'x'.repeat(400) });
    expect(sentBodies[0].text.length).toBe(280);
  });

  it('requires text', async () => {
    const result = await postToTwitter({ text: '' });
    expect(result.success).toBe(false);
  });
});
