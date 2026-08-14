/**
 * #130 get_schedule_status — read-only schedule state.
 * Run: node lib/ao/getScheduleStatus.selftest.mjs
 */
import assert from 'assert';
import { getScheduleStatus } from './getScheduleStatus.js';
import { findUnbackedActionClaims } from './gateActionClaims.js';

let draftWrites = 0;
let captionWrites = 0;

const loadDraftSpy = async (slug) => {
  if (slug === 'the-standard-that-held') {
    return {
      id: 'draft-1',
      slug: 'the-standard-that-held',
      title: 'The Standard That Held',
      status: 'approved',
      approved_at: '2026-08-14T12:00:00.000Z',
      scheduled_publish_at: '2026-08-19T11:00:00.000Z',
      image_url: 'https://example.com/header.jpg',
      published_at: null,
    };
  }
  if (slug === 'draft-only-no-captions') {
    return {
      id: 'draft-2',
      slug: 'draft-only-no-captions',
      title: 'Draft Only',
      status: 'approved',
      approved_at: '2026-08-14T12:00:00.000Z',
      scheduled_publish_at: null,
      image_url: null,
      published_at: null,
    };
  }
  return null;
};

const loadCaptionsSpy = async (slug) => {
  if (slug === 'the-standard-that-held') {
    return [
      {
        platform: 'linkedin',
        account_id: 'personal',
        scheduled_at: '2026-10-07T15:30:00.000Z',
        status: 'scheduled',
        intent: { channel_label: 'linkedin_personal', journal_slug: slug },
      },
      {
        platform: 'instagram',
        account_id: 'meta',
        scheduled_at: '2026-10-07T20:30:00.000Z',
        status: 'scheduled',
        intent: { channel_label: 'instagram_business', journal_slug: slug },
      },
      {
        platform: 'instagram',
        account_id: 'ig_mediaphish',
        scheduled_at: '2026-10-07T20:30:00.000Z',
        status: 'scheduled',
        intent: { channel_label: 'instagram_personal', journal_slug: slug },
      },
      {
        platform: 'facebook',
        account_id: 'meta',
        scheduled_at: '2026-10-07T18:30:00.000Z',
        status: 'scheduled',
        intent: { channel_label: 'facebook_business', journal_slug: slug },
      },
      {
        platform: 'twitter',
        account_id: 'personal',
        scheduled_at: '2026-10-07T15:30:00.000Z',
        status: 'scheduled',
        intent: { channel_label: 'twitter', journal_slug: slug },
      },
    ];
  }
  return [];
};

// Wrap spies so accidental write APIs would be obvious if someone adds them later
const loadDraft = async (...args) => {
  // read path only
  return loadDraftSpy(...args);
};
const loadCaptions = async (...args) => {
  return loadCaptionsSpy(...args);
};

// Test 1: real draft + 5 captions, zero writes
{
  const result = await getScheduleStatus({
    slug: 'the-standard-that-held',
    loadDraft,
    loadCaptions,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.draft.status, 'approved');
  assert.strictEqual(result.draft.scheduled_publish_at, '2026-08-19T11:00:00.000Z');
  assert.strictEqual(result.draft.has_image, true);
  assert.strictEqual(result.captions.length, 5);
  assert.strictEqual(result.caption_count, 5);
  assert.ok(result.captions.every((c) => c.scheduled_at && c.platform && c.status));
  assert.strictEqual(draftWrites, 0);
  assert.strictEqual(captionWrites, 0);
}

// Test 2: no draft
{
  const result = await getScheduleStatus({
    slug: 'does-not-exist-anywhere',
    loadDraft,
    loadCaptions,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.draft, null);
  assert.deepStrictEqual(result.captions, []);
}

// Test 3: draft, zero captions
{
  const result = await getScheduleStatus({
    slug: 'draft-only-no-captions',
    loadDraft,
    loadCaptions,
  });
  assert.strictEqual(result.ok, true);
  assert.ok(result.draft);
  assert.strictEqual(result.draft.has_image, false);
  assert.deepStrictEqual(result.captions, []);
}

// Test 4: quoting status after get_schedule_status does not trip schedule gates
{
  const reply =
    'Current schedule status: scheduled_publish_at is 2026-08-19. Captions are scheduled on LinkedIn, Instagram, Facebook, and X (5 rows).';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [
      {
        name: 'get_schedule_status',
        result: {
          ok: true,
          draft: { status: 'approved', scheduled_publish_at: '2026-08-19T11:00:00.000Z' },
          captions: [{ platform: 'linkedin', status: 'scheduled' }],
        },
      },
    ],
  });
  assert.ok(
    !unbacked.some((u) => u.ruleId === 'schedule' || u.ruleId === 'schedule_journal_publish'),
    'read-backed schedule status report must not fire schedule gates'
  );
}

console.log('getScheduleStatus.selftest: PASS');
