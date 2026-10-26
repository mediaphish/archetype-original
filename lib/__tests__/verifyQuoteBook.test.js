/**
 * @jest-environment node
 *
 * 2026-10-26: Jot could not check a line from RemAIning Human because the
 * quote checker only read the public copy of the site's writing, which leaves
 * out the books. The line is in the book word for word.
 */
import { readFileSync } from 'node:fs';

test('the quote checker reads the full copy, which carries the books', () => {
  const src = readFileSync('lib/ao/autoToolHandlers.js', 'utf8');
  expect(src).toMatch(/docs\?.docs \|\| docs\?.documents/);
  expect(src).toMatch(/for \(const knowledgePath of \[path\.join\(root, 'data\/knowledge-full\.json'\), path\.join\(root, 'public\/knowledge\.json'\)\]\)/);
  const full = JSON.parse(readFileSync('data/knowledge-full.json', 'utf8'));
  const list = Array.isArray(full) ? full : full.docs || full.documents || [];
  const book = list.find((d) => d.slug === 'remaining-human');
  expect(String(book.body || book.content)).toContain('Authority becomes legitimate when responsibility is visible.');
});

test('the full copy goes to the server with the chat', () => {
  const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const chat = v.builds.find((b) => b.src === 'api/ao/auto/chat.js');
  expect(chat.config.includeFiles).toContain('data/knowledge-full.json');
});
