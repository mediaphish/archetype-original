/**
 * Regression checks for Auto intent helpers (gap vs card index, schedule tweak).
 * Run: node scripts/auto-intent-regression.mjs
 */

import {
  wantsPublishScheduleTweak,
  parseGapDaysFromMessage,
  stripGapPhrasesForCardIndexParse,
  getWizardFirstRouteKey,
} from '../lib/ao/autoIntent.js';

function parseQuoteIndicesFromMessage(text) {
  const s = String(text || '');
  const nums = new Set();
  const re = /\b([1-9])\b/g;
  let m = re.exec(s);
  while (m) {
    nums.add(Number(m[1]));
    m = re.exec(s);
  }
  return [...nums].sort((a, b) => a - b);
}

let failed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failed += 1;
  } else {
    console.log(`ok: ${name}`);
  }
}

const tweakMsg =
  'Can we tweak the schedule to not be every day? Make them every 2 or 3 days? Possible?';
assert('schedule tweak detected', wantsPublishScheduleTweak(tweakMsg));
assert('gap from 2 or 3 days', parseGapDaysFromMessage(tweakMsg) === 2);

const stripped = stripGapPhrasesForCardIndexParse(tweakMsg);
const idx = parseQuoteIndicesFromMessage(stripped);
assert('after strip, no false card 2,3 from day phrase', idx.join(',') !== '2,3');

assert('every 3 days → 3', parseGapDaysFromMessage('post every 3 days') === 3);
assert('every other day → 2', parseGapDaysFromMessage('every other day please') === 2);
assert('confirm publish not schedule tweak', !wantsPublishScheduleTweak('CONFIRM PUBLISH'));
assert('cancel not schedule tweak', !wantsPublishScheduleTweak('cancel'));

const mockAwaitConfirm = { publish_wizard: { step: 'await_confirm', pending: { items: [{ corpus_index: 1 }] } } };
assert(
  'wizard-first: schedule tweak wins',
  getWizardFirstRouteKey(tweakMsg, mockAwaitConfirm) === 'publish_schedule_tweak'
);
assert('wizard-first: confirm', getWizardFirstRouteKey('CONFIRM PUBLISH', mockAwaitConfirm) === 'publish_confirm');

process.exit(failed ? 1 : 0);
