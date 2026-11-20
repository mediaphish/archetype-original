/**
 * @jest-environment node
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
const { addedBriefSections } = require('../ao/generateGuestResearch.js');

test('sections added after the standard six survive a regenerate', () => {
  const brief = '1. THE PERSON IN ONE PARAGRAPH\nJaron.\n\n6. ONE THING TO AVOID\nNo.\n\n## 7. THE ARCHETYPE SERIES CLOSE\nClose here.\n\n### Open items\nTitle.';
  const kept = addedBriefSections(brief);
  expect(kept.startsWith('## 7. THE ARCHETYPE SERIES CLOSE')).toBe(true);
  expect(kept).toContain('Open items');
  expect(kept).not.toContain('ONE THING TO AVOID');
});

test('a brief with only the standard six carries nothing', () => {
  expect(addedBriefSections('1. A\nx\n6. B\ny')).toBe('');
  expect(addedBriefSections('')).toBe('');
});
