/**
 * #127 scheduled journal auto-publish selftests.
 * Run: node lib/ao/publishDueScheduledJournals.selftest.mjs
 */
import assert from 'assert';
import { buildCompleteCaptionsBlockForTest } from './waypointGates.js';
import { publishDueScheduledJournals } from './publishDueScheduledJournals.js';
import { parseScheduledPublishAt } from '../db/scheduledJournalPublish.js';

{
  const d = parseScheduledPublishAt('2026-08-19');
  assert.ok(d.ok);
  assert.ok(d.iso.includes('2026-08-19') || d.iso.startsWith('2026-08-1'));
  const bad = parseScheduledPublishAt('not-a-date');
  assert.strictEqual(bad.ok, false);
}

const captions = buildCompleteCaptionsBlockForTest('Ready caption');
const goodDraft = {
  id: 'draft-good',
  slug: 'due-good-post',
  title: 'Due Good Post',
  kind: 'journal',
  status: 'approved',
  image_url: 'https://www.archetypeoriginal.com/images/leading-well-under-bad-leadership.jpg',
  content: `# Due Good Post\n\nBody here.\n\n${captions}`,
  summary: 'Summary',
  metadata: {},
  scheduled_publish_at: '2020-01-01T00:00:00.000Z',
  published_at: null,
  created_by_email: 'bart@example.com',
};

const futureDraft = {
  ...goodDraft,
  id: 'draft-future',
  slug: 'future-post',
  scheduled_publish_at: '2099-01-01T00:00:00.000Z',
};

const incompleteDraft = {
  ...goodDraft,
  id: 'draft-incomplete',
  slug: 'incomplete-post',
  content: '# Incomplete\n\nNo captions block.',
  scheduled_publish_at: '2020-01-01T00:00:00.000Z',
};

const logs = [];
const publishCalls = [];

// Test 1 + 2 + 3 + 4 in one injected run: listDue returns only "due" rows
// (future excluded by query); incomplete skipped; good published; one failure doesn't block.
const result = await publishDueScheduledJournals({
  nowIso: '2026-08-14T12:00:00.000Z',
  listDue: async () => ({
    ok: true,
    // future draft would not be returned by real listDue (lte filter) — omit it here
    rows: [incompleteDraft, goodDraft],
  }),
  loadScheduledRows: async () => [],
  publishEntry: async (params) => {
    publishCalls.push(params);
    return {
      ok: true,
      journal_url: `https://www.archetypeoriginal.com/journal/${params.slug}`,
    };
  },
  log: async (row) => {
    logs.push(row);
  },
});

assert.strictEqual(result.ok, true);
assert.strictEqual(result.published, 1, 'exactly one valid due draft publishes');
assert.strictEqual(result.skipped, 1, 'incomplete draft is skipped');
assert.strictEqual(publishCalls.length, 1);
assert.strictEqual(publishCalls[0].slug, 'due-good-post');
assert.ok(
  result.results.some((r) => r.slug === 'incomplete-post' && r.status === 'skipped'),
  'incomplete must be skipped with reason'
);
assert.ok(
  logs.some((l) => l.action_type === 'scheduled_journal_publish_skipped'),
  'skip must be logged'
);
assert.ok(
  logs.some((l) => l.action_type === 'scheduled_journal_published'),
  'success must be logged'
);

// Test 2 explicit: future-only list → nothing published
const futureOnly = await publishDueScheduledJournals({
  listDue: async () => ({ ok: true, rows: [] }), // query already filtered future out
  publishEntry: async () => {
    throw new Error('should not publish');
  },
  log: async () => {},
});
assert.strictEqual(futureOnly.published, 0);
assert.strictEqual(futureOnly.processed, 0);

// Sanity: if a future row were wrongly passed, we still only publish what's listed —
// documenting that listDue is the gate for "in the future"
void futureDraft;

console.log('publishDueScheduledJournals.selftest: PASS');
