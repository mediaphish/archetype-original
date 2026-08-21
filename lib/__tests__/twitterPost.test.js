/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

jest.mock('../social/config.js', () => ({
  getSocialCredentials: jest.fn(() => null), // OAuth 1.0a keys are no longer used for images
}));

jest.mock('../social/xConnection.js', () => ({
  getXAccessToken: jest.fn(async () => ({ ok: true, accessToken: 'test-oauth2-token' })),
}));

import { postToTwitter } from '../social/twitter.js';

const STORAGE_URL =
  'https://cejecqtftkzyulzrtksx.supabase.co/storage/v1/object/public/ao-auto-attachments/quote-card-123.png';

describe('postToTwitter', () => {
  let calls;

  function mockFetch({ uploadStatus = 200, tweetStatus = 200 } = {}) {
    global.fetch = jest.fn(async (url, init) => {
      const u = String(url);
      calls.push({ url: u, body: init?.body, headers: init?.headers });

      // The image fetch: return bytes, not JSON.
      if (u.startsWith(STORAGE_URL)) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'image/png' },
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        };
      }

      if (u.includes('/2/media/upload')) {
        return {
          ok: uploadStatus === 200,
          status: uploadStatus,
          headers: { get: () => 'application/json' },
          json: async () =>
            uploadStatus === 200
              ? { data: { id: 'media-999' } }
              : { detail: 'Unsupported Authentication' },
        };
      }

      return {
        ok: tweetStatus === 200,
        status: tweetStatus,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: '123' } }),
      };
    });
  }

  beforeEach(() => {
    calls = [];
    mockFetch();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('never posts a raw storage URL as tweet text', async () => {
    // What shipped on 2026-08-13: the quote, then
    // "cejecqtftkzyulzrtksx.supabase.co/storage/v1/obj…" as visible body text,
    // recorded as a successful post.
    await postToTwitter({ text: 'Management is doing things right. Drucker.' });

    for (const c of calls) {
      const body = c.body ? String(c.body) : '';
      expect(body).not.toContain('supabase.co');
      expect(body).not.toContain('/storage/v1/');
    }
  });

  it('uploads to the v2 media endpoint, not the retired v1.1 one', async () => {
    // X retired upload.twitter.com/1.1/media/upload.json on 2025-06-09. Calling
    // it returned "Could not authenticate you", which reads like a credential
    // problem and cost us a detour through the developer console.
    await postToTwitter({ text: 'A leader knows the way.', imageUrl: STORAGE_URL });

    const urls = calls.map((c) => c.url);
    expect(urls.some((u) => u.includes('api.x.com/2/media/upload'))).toBe(true);
    expect(urls.some((u) => u.includes('upload.twitter.com'))).toBe(false);
    expect(urls.some((u) => u.includes('/1.1/media/upload'))).toBe(false);
  });

  it('attaches the returned media id to the tweet', async () => {
    const result = await postToTwitter({ text: 'Quote card.', imageUrl: STORAGE_URL });

    expect(result.success).toBe(true);
    const tweetCall = calls.find((c) => c.url.endsWith('/2/tweets'));
    expect(JSON.parse(tweetCall.body)).toEqual({
      text: 'Quote card.',
      media: { media_ids: ['media-999'] },
    });
  });

  it('uses the OAuth 2.0 bearer token for the upload', async () => {
    await postToTwitter({ text: 'Quote card.', imageUrl: STORAGE_URL });
    const upload = calls.find((c) => c.url.includes('/2/media/upload'));
    expect(upload.headers.Authorization).toBe('Bearer test-oauth2-token');
  });

  it('explains a 403 as a missing media.write scope', async () => {
    // The failure mode a token issued before the scope existed will hit. Bare
    // "403 Forbidden" would not tell anyone to reconnect X.
    mockFetch({ uploadStatus: 403 });
    const result = await postToTwitter({ text: 'Quote card.', imageUrl: STORAGE_URL });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/media\.write/);
    expect(result.error).toMatch(/reconnect/i);
  });

  it('refuses to post at all when an image was intended but cannot be attached', async () => {
    // A quote card without its card is not the post. Failing loudly is what
    // surfaced this; silently posting text is what hid it for eight days.
    mockFetch({ uploadStatus: 500 });
    const result = await postToTwitter({ text: 'Quote card.', imageUrl: STORAGE_URL });

    expect(result.success).toBe(false);
    expect(calls.some((c) => c.url.endsWith('/2/tweets'))).toBe(false);
  });

  it('still posts a text-only tweet when no image was intended', async () => {
    const result = await postToTwitter({ text: 'A leader knows the way. Maxwell.' });
    expect(result.success).toBe(true);
    const tweetCall = calls.find((c) => c.url.endsWith('/2/tweets'));
    expect(JSON.parse(tweetCall.body).text).toBe('A leader knows the way. Maxwell.');
  });

  it('truncates to the 280 character limit', async () => {
    await postToTwitter({ text: 'x'.repeat(400) });
    const tweetCall = calls.find((c) => c.url.endsWith('/2/tweets'));
    expect(JSON.parse(tweetCall.body).text.length).toBe(280);
  });

  it('requires text', async () => {
    const result = await postToTwitter({ text: '' });
    expect(result.success).toBe(false);
  });
});
