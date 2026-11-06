/**
 * @jest-environment node
 *
 * 2026-11-06: a chat opened from a Queue item starts with its image and captions,
 * so Bart and the team are looking at the same thing.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
jest.mock('../db/scheduledPosts.js', () => ({ scheduledPosts: () => ({}) }));
import { parseQueueRef, contextCardText } from '../ao/queueContext.js';

test('reads a Queue item reference', () => {
  expect(parseQueueRef('infographic:83fe')).toEqual({ kind: 'infographic', key: '83fe' });
  expect(parseQueueRef('resurface:the-saul-archetype')).toEqual({ kind: 'resurface', key: 'the-saul-archetype' });
  expect(parseQueueRef('draft:x')).toBeNull();
  expect(parseQueueRef('')).toBeNull();
});

test('the card carries the image, both captions, the source and the id', () => {
  const t = contextCardText({
    kind: 'infographic', title: 'The Hunger', status: 'pending', sourceUrl: 'https://a/j',
    captions: [{ label: 'Instagram, Facebook, LinkedIn', text: 'Long caption' }, { label: 'X', text: 'Short' }, { label: 'none', text: '' }],
    imageUrl: 'https://a/i.png', id: '83fe',
  });
  expect(t).toMatch(/^Cam: /);
  expect(t).toContain('waiting in your Queue');
  expect(t).toContain('Long caption');
  expect(t).toContain('Caption (X):\nShort');
  expect(t).not.toContain('Caption (none)');
  expect(t).toContain('Image: https://a/i.png');
  expect(t).toContain('Infographic id: 83fe');
  expect(t).not.toMatch(/—/);
});
