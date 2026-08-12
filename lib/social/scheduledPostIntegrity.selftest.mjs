/**
 * Regression: shared scheduled-post integrity gate.
 * Run: node lib/social/scheduledPostIntegrity.selftest.mjs
 */
import {
  validateScheduledPostRows,
  syncScheduledPostCopyFields,
  assertRowReadyToPublish,
  formatIntegrityRejectedSummary,
} from './scheduledPostIntegrity.js';
import { assertPublishableScheduledText } from '../ao/scheduledPostCopy.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  const { valid, rejected } = validateScheduledPostRows([
    {
      platform: 'linkedin',
      account_id: 'personal',
      text: 'Real leadership is quiet.',
      caption: 'Real leadership is quiet.',
      status: 'scheduled',
    },
    {
      platform: 'facebook',
      account_id: 'meta',
      text: 'Quote card 1',
      caption: 'Quote card 1',
      status: 'scheduled',
    },
    {
      platform: 'instagram',
      account_id: 'meta',
      text: 'undefined',
      caption: 'undefined',
      status: 'scheduled',
    },
    {
      platform: 'twitter',
      account_id: 'personal',
      text: 'Another real caption for X.',
      status: 'scheduled',
    },
  ]);

  assert(valid.length === 2, `expected 2 valid, got ${valid.length}`);
  assert(rejected.length === 2, `expected 2 rejected, got ${rejected.length}`);
  assert(
    valid.every((r) => r.text === r.caption),
    'valid rows must have synced text/caption'
  );
  assert(
    rejected.some((r) => /Quote card/i.test(r.reason)),
    'placeholder Quote card rejected'
  );
  assert(
    rejected.some((r) => /undefined|Placeholder/i.test(r.reason)),
    'literal undefined rejected'
  );
  const summary = formatIntegrityRejectedSummary(rejected);
  assert(summary && /2 scheduled post/.test(summary), 'summary names count');
}

{
  // text empty, caption real → heal and sync (do not discard)
  const synced = syncScheduledPostCopyFields({
    text: '',
    caption: 'Healed from caption only.',
  });
  assert(synced.ok, 'should heal from caption');
  assert(synced.text === synced.caption, 'must sync both fields');
  assert(synced.healed === true, 'healed flag');

  const { valid, rejected } = validateScheduledPostRows([
    {
      platform: 'linkedin',
      account_id: 'personal',
      text: 'Quote card 7',
      caption: 'The real caption that should win.',
      status: 'scheduled',
    },
  ]);
  assert(rejected.length === 0, 'placeholder text healed from real caption');
  assert(valid.length === 1, 'healed row is valid');
  assert(valid[0].text === 'The real caption that should win.', 'caption wins over placeholder text');
  assert(valid[0].text === valid[0].caption, 'no drift after heal');
}

{
  // Independent last-mile layer (publish.js)
  const blocked = assertRowReadyToPublish({ text: 'Quote card 3', caption: 'Quote card 3' });
  assert(!blocked.ok, 'publish layer blocks placeholder');
  const alsoBlocked = assertPublishableScheduledText({ text: 'none', caption: 'none' });
  assert(!alsoBlocked.ok, 'scheduledPostCopy layer also blocks');
  const ok = assertRowReadyToPublish({
    text: 'Real leadership is quiet.',
    caption: 'Real leadership is quiet.',
  });
  assert(ok.ok, 'real copy publishes');
}

{
  const { valid, rejected } = validateScheduledPostRows([
    { platform: 'linkedin', text: '—', caption: '—' },
    { platform: 'facebook', text: 'null', caption: 'null' },
  ]);
  assert(valid.length === 0 && rejected.length === 2, 'em-dash and null string rejected');
}

console.log('scheduledPostIntegrity.selftest.mjs: ok');
