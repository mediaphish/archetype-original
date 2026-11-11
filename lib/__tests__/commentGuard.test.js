/**
 * @jest-environment node
 *
 * Bart, 2026-11-11, "Build the guard": link comments failed on every channel
 * from May on and nobody heard. LinkedIn's go in the post; Bit reports any failure.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { commentGoesInPost, withCommentInPost } from '../social/capabilities.js';
import { failedCommentsCheck } from '../ao/team/bit.js';

describe('link comment guard', () => {
  test('LinkedIn puts the comment in the post, the others keep it as a comment', () => {
    expect(commentGoesInPost('linkedin')).toBe(true);
    expect(commentGoesInPost('facebook')).toBe(false);
    expect(commentGoesInPost('instagram')).toBe(false);
  });
  test('the comment lands once at the bottom', () => {
    expect(withCommentInPost('Post body.\n', 'Link: https://x.test')).toBe('Post body.\n\nLink: https://x.test');
    expect(withCommentInPost('Post body.\n\nLink: https://x.test', 'Link: https://x.test')).toBe('Post body.\n\nLink: https://x.test');
  });
  test('Bit reports a failed comment this week, and not an old one', () => {
    const now = Date.parse('2026-11-11T20:00:00Z');
    const fresh = { id: 'a', platform: 'facebook', first_comment_status: 'failed', first_comment_error_message: 'expired', updated_at: '2026-11-10T21:30:00Z' };
    const old = { ...fresh, id: 'b', updated_at: '2026-10-01T00:00:00Z' };
    expect(failedCommentsCheck([old], { now }).status).toBe('ok');
    const r = failedCommentsCheck([fresh, old], { now });
    expect(r.status).toBe('broken');
    expect(r.detail).toContain('1 post went out this week without the comment');
  });
});
