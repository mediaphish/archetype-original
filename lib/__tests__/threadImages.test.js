/**
 * @jest-environment node
 *
 * The team sees the pictures in a conversation (Bart, 2026-11-17: "Vox should
 * have the ability to see images").
 */
import { storedImageUrls, threadImagesToShow, withThreadImages, MAX_THREAD_IMAGES } from '../ao/threadImages.js';

const BASE = 'https://cejecqtftkzyulzrtksx.supabase.co/storage/v1/object/public/ao-auto-attachments';
const OLD = `${BASE}/infographics/4042046a.png`;
const NEW = `${BASE}/ao-design-images/infographic-1794958447149.png`;

test('only pictures in the site storage count, never other links', () => {
  expect(storedImageUrls(`Image: ${OLD}. And https://example.com/x.png and ${BASE}/doc.pdf`)).toEqual([OLD]);
  expect(storedImageUrls(`(see ${NEW})`)).toEqual([NEW]);
});

test('the newest pictures come first, at most two, none repeated', () => {
  const history = [
    { role: 'user', content: `Queue card. Image: ${OLD}` },
    { role: 'assistant', content: `Remade it: ${NEW}` },
    { role: 'user', content: `Compare with ${OLD}` },
  ];
  expect(threadImagesToShow(history, 'What do you think?')).toEqual([OLD, NEW]);
  expect(MAX_THREAD_IMAGES).toBe(2);
  // A picture already on the turn as an attachment is not added twice.
  expect(threadImagesToShow(history, 'ok', { skip: [OLD] })).toEqual([NEW]);
});

test('an old card picture is shown only when the talk is about a picture', () => {
  const history = [{ role: 'user', content: `Queue card. Image: ${OLD}` }, ...Array.from({ length: 8 }, (_, i) => ({ role: 'assistant', content: `step ${i}` }))];
  expect(threadImagesToShow(history, 'When does it post?')).toEqual([]);
  expect(threadImagesToShow(history, 'Look at the spacing on the infographic')).toEqual([OLD]);
});

test('the pictures go in front of the words, as links the model loads', () => {
  const out = withThreadImages('Review this', [NEW]);
  expect(out[0]).toEqual({ type: 'image', source: { type: 'url', url: NEW } });
  expect(out[1].type).toBe('text');
  expect(out[2]).toEqual({ type: 'text', text: 'Review this' });
  expect(withThreadImages('Review this', [])).toBe('Review this');
  const withAttachment = withThreadImages([{ type: 'image', source: { type: 'base64' } }, { type: 'text', text: 'hi' }], [OLD]);
  expect(withAttachment).toHaveLength(4);
});
