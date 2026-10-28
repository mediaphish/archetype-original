/**
 * @jest-environment node
 */
// 2026-10-28: Bart's short video clips go out as Reels (notes/PLAN-video-moments.md).
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const { reelStatusStep } = require('../social/reels.js');
const { videoClipRows } = require('../ao/scheduleVideoClip.js');
const { splitVideoClips, videoClipTag } = require('../../src/lib/videoClips.js');

const CLIP = 'https://cejecqtftkzyulzrtksx.supabase.co/storage/v1/object/public/ao-episode-video/clips/bart/moments/abc-take1.mp4';
const later = new Date(Date.now() + 86400000).toISOString();
const captions = { instagram_business: 'One.', instagram_personal: 'Two.', facebook_business: 'Three.' };

test('Instagram processing: wait, publish, or fail', () => {
  expect(reelStatusStep('IN_PROGRESS')).toBe('wait');
  expect(reelStatusStep('FINISHED')).toBe('publish');
  expect(reelStatusStep('ERROR')).toBe('failed');
});

test('a clip he uploaded becomes three Reels, one caption per channel', () => {
  const out = videoClipRows({ video_url: CLIP, captions, scheduled_at: later, title: 'Who signs' });
  expect(out.ok).toBe(true);
  expect(out.rows.map((r) => `${r.platform}:${r.account_id}`)).toEqual(['instagram:meta', 'instagram:ig_mediaphish', 'facebook:meta']);
  expect(out.rows.every((r) => r.video_url === CLIP && r.source_kind === 'video_moment')).toBe(true);
});

test('only his uploaded clips, a future time, and every caption', () => {
  expect(videoClipRows({ video_url: 'https://example.com/x.mp4', captions, scheduled_at: later }).ok).toBe(false);
  expect(videoClipRows({ video_url: CLIP, captions, scheduled_at: '2020-01-01T00:00:00Z' }).ok).toBe(false);
  expect(videoClipRows({ video_url: CLIP, captions: { instagram_business: 'x' }, scheduled_at: later }).error).toMatch(/instagram_personal/);
});

test('the chat line for an upload round-trips', () => {
  const { clips, text } = splitVideoClips(`${videoClipTag(CLIP)}\n\nThis is the stress test one.`);
  expect(clips).toEqual([CLIP]);
  expect(text).toBe('This is the stress test one.');
});

test('the publisher posts a video row as a Reel and keeps a still-processing one scheduled', async () => {
  const { publishOne } = require('../social/publish.js');
  const row = { id: 'p1', platform: 'instagram', account_id: 'meta', text: 'Caption that is long enough to post.', video_url: CLIP, intent: {} };
  const deps = { deps: {} };
  const pending = await publishOne(row, { ...deps, adapters: { instagram: () => ({ success: false }), instagramReel: async () => ({ success: false, pending: true, containerId: 'c9' }) } });
  expect(pending).toEqual({ ok: false, pending: true, containerId: 'c9' });
  const done = await publishOne({ ...row, intent: { reel_container: 'c9' } }, { ...deps, adapters: { instagram: () => ({ success: false }), instagramReel: async (r) => (r.containerId === 'c9' ? { success: true, postId: 'ig1' } : { success: false }) } });
  expect(done.ok).toBe(true);
  expect(done.externalId).toBe('ig1');
  const li = await publishOne({ ...row, platform: 'linkedin' }, { ...deps, adapters: { linkedin: () => ({ success: true, postId: 'x' }) } });
  expect(li.ok).toBe(false);
});
