/**
 * @jest-environment node
 *
 * getXAccessToken must return the token's scope.
 *
 * Image posting is gated on media.write. The scope column was already being
 * selected from ao_x_tokens and then dropped from both return paths, so every
 * caller saw undefined and concluded the scope was missing. The result was a
 * check that reported X images as broken while uploads were succeeding —
 * x-media-check returned ok:true with a real media id alongside
 * hasMediaWrite:false.
 *
 * A wrong red light costs as much trust as a wrong green one.
 */
import { jest } from '@jest/globals';

const mockRow = {
  id: 'row-1',
  access_token: 'stored-token',
  refresh_token: 'refresh-token',
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // not near expiry
  scope: 'offline.access tweet.write media.write users.read tweet.read',
  token_type: 'bearer',
  user_id: '123',
  username: 'archetypeog',
  updated_at: new Date().toISOString(),
};

jest.mock('../supabase-admin.js', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: mockRow, error: null }),
          }),
        }),
      }),
    }),
  },
}));

import { getXAccessToken } from '../social/xConnection.js';

describe('getXAccessToken', () => {
  it('returns the stored scope so media.write checks can see it', async () => {
    const token = await getXAccessToken();

    expect(token.ok).toBe(true);
    expect(token.accessToken).toBe('stored-token');
    expect(String(token.scope || '').split(/\s+/)).toContain('media.write');
  });

  it('still carries username and userId alongside scope', async () => {
    const token = await getXAccessToken();
    expect(token.username).toBe('archetypeog');
    expect(token.userId).toBe('123');
  });
});
