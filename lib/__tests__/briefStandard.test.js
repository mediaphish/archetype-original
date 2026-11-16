import { BRIEF_STANDARD } from '../ao/team/briefStandard.js';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

describe('the brief standard (Bart, 2026-11-16)', () => {
  test('names every part of the reference brief', () => {
    for (const part of ['THE ARCHETYPE', 'WHY THE STORY EXISTS', 'THE WHOLE STORY, IN ORDER', 'HARD QUESTIONS', 'SERIES AND CORPUS CONTEXT', 'WHERE IT ALIGNS and WHERE IT MISSES', 'THE LEADERSHIP THREAD', 'THE QUESTION THIS ARCHETYPE ASKS', 'SOURCES (RECEIPTS)']) {
      expect(BRIEF_STANDARD).toContain(part);
    }
  });
  test('keeps his source rule and his own story out', () => {
    expect(BRIEF_STANDARD).toMatch(/No Wikipedia/);
    expect(BRIEF_STANDARD).toMatch(/Never name, describe or hint at a former partner/);
  });
  test('uses no em dashes', () => {
    expect(BRIEF_STANDARD).not.toMatch(/—/);
  });
});
