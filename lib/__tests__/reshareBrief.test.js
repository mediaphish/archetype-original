/**
 * @jest-environment node
 *
 * The two-sentence "why this one" brief Bart reads on each reshare (2026-10-24).
 */
import { writeReshareBrief, briefPrompt } from '../ao/reshareBrief.js';

test('the brief is for Bart, short, and clean of dashes', async () => {
  const complete = async () => 'This one lands because it names the cost of waiting — and leaders are waiting.  It helps anyone stuck.';
  const out = await writeReshareBrief({ title: 'Accountability Comes First', pullQuote: 'q', selectionReason: 'r', caption: 'c' }, { complete });
  expect(out).not.toMatch(/—/);
  expect(out.length).toBeLessThanOrEqual(400);
  expect(briefPrompt({ title: 'T' })).toMatch(/two short sentences for Bart/);
});

test('no answer means no brief rather than a placeholder', async () => {
  expect(await writeReshareBrief({ title: 'T' }, { complete: async () => '' })).toBeNull();
});
