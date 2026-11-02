/**
 * @jest-environment node
 *
 * Bart, 2026-11-02: quote cards, resurfaces and infographics go out
 * "automatically to all channels we are connected to", and his hand-posted
 * journal launches on the company page must never be duplicated.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { companyPageCopy } from '../db/scheduledPosts.js';

const row = { platform: 'linkedin', account_id: 'personal', scheduled_at: '2026-11-03T17:30:00.000Z', text: 'Caption', image_url: 'x', status: 'scheduled', intent: { a: 1 } };

test.each(['auto_quote_card', 'ao_journal_reshare', 'infographic'])('%s also goes to the company page, an hour later', (source_kind) => {
  const copy = companyPageCopy({ ...row, source_kind });
  expect(copy.account_id).toBe('page_1');
  expect(copy.text).toBe('Caption');
  expect(copy.scheduled_at).toBe('2026-11-03T18:30:00.000Z');
  expect(copy.status).toBe('scheduled');
});

test('his journal launches are never copied, so nothing is duplicated', () => {
  expect(companyPageCopy({ ...row, source_kind: 'journal_launch' })).toBeNull();
});

test('only the personal LinkedIn row is copied, and a copy is not copied again', () => {
  expect(companyPageCopy({ ...row, platform: 'twitter', source_kind: 'infographic' })).toBeNull();
  expect(companyPageCopy({ ...row, account_id: 'page_1', source_kind: 'infographic' })).toBeNull();
});
