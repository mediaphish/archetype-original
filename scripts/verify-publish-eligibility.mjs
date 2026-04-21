#!/usr/bin/env node
/**
 * Smoke-check schedule rules (runs with plain Node, no Jest).
 * npm run build already runs build-knowledge; this catches regressions in lib/publish-eligibility.mjs.
 */

import assert from 'assert';
import {
  publishDateCalendarOnly,
  filterPublishedScheduledDocs,
  shouldSkipFutureScheduledMarkdown,
  isEligibleForPublicSchedule,
} from '../lib/publish-eligibility.mjs';

assert.strictEqual(publishDateCalendarOnly('2026-04-23T12:00:00Z'), '2026-04-23');

const far = filterPublishedScheduledDocs(
  [
    { type: 'journal-post', slug: 'x', publish_date: '2099-01-01' },
    { type: 'journal-post', slug: 'y', publish_date: '2000-01-01' },
  ],
  new Date('2026-06-01T12:00:00Z')
);
assert.strictEqual(far.length, 1);
assert.strictEqual(far[0].slug, 'y');

assert.strictEqual(
  shouldSkipFutureScheduledMarkdown(
    { publish_date: '2099-01-15' },
    { isJournalOrDevotional: true, now: new Date('2026-01-01T12:00:00Z') }
  ),
  true
);

assert.strictEqual(
  isEligibleForPublicSchedule(
    { type: 'journal-post', publish_date: '2026-04-21' },
    new Date('2026-04-21T18:00:00Z')
  ),
  true
);

console.log('✅ verify-publish-eligibility: OK');
