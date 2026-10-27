/**
 * @jest-environment node
 *
 * 2026-10-27: Bart's 21 RemAIning Human images dropped out of what the team
 * sees one reply after he attached them. They stay listed for the conversation.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { formatThreadReferenceImagesNote } from '../ao/chatAttachedImageFact.js';

test('the note lists every earlier image and says they stay usable', () => {
  const note = formatThreadReferenceImagesNote([{ url: 'https://x/a.jpg' }, { url: 'https://x/b.jpg' }]);
  expect(note).toMatch(/\(2\)/);
  expect(note).toMatch(/1\. https:\/\/x\/a\.jpg/);
  expect(note).toMatch(/2\. https:\/\/x\/b\.jpg/);
  expect(note).toMatch(/Never say they are lost/);
  expect(formatThreadReferenceImagesNote([])).toBe('');
});

test('every turn adds the earlier images, used or not', () => {
  const chat = readFileSync('api/ao/auto/chat.js', 'utf8');
  expect(chat).toMatch(/loadThreadReferenceImages\(thread\.id\)/);
  expect(chat).toMatch(/formatThreadReferenceImagesNote\(earlier\)/);
});
