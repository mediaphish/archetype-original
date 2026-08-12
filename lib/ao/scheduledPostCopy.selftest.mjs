/**
 * Regression selftest for quote-card placeholder publish landmine.
 * Run: node lib/ao/scheduledPostCopy.selftest.mjs
 */
import {
  isPlaceholderScheduledText,
  buildSyncedScheduledCopy,
  assertPublishableScheduledText,
  resolveQuoteCardScheduleCopy,
} from './scheduledPostCopy.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  assert(isPlaceholderScheduledText('Quote card 1'), 'Quote card 1 is placeholder');
  assert(isPlaceholderScheduledText('Quote card 14'), 'Quote card 14 is placeholder');
  assert(isPlaceholderScheduledText('none'), 'none is placeholder');
  assert(isPlaceholderScheduledText(''), 'empty is placeholder');
  assert(isPlaceholderScheduledText('  '), 'whitespace is placeholder');
  assert(!isPlaceholderScheduledText('Real leadership is quiet.'), 'real copy is fine');
}

{
  const bad = buildSyncedScheduledCopy('Quote card 1');
  assert(!bad.ok, 'synced copy must reject placeholder');
  const good = buildSyncedScheduledCopy('Real leadership is quiet.');
  assert(good.ok && good.text === good.caption, 'synced fields must match');
}

{
  const missing = resolveQuoteCardScheduleCopy({ card_index: 1, line1: 'A', line2: 'B' });
  assert(!missing.ok, 'schedule-cards requires caption');

  const placeholderCap = resolveQuoteCardScheduleCopy({
    card_index: 1,
    caption: 'Quote card 1',
    line1: 'Power says: x',
  });
  assert(!placeholderCap.ok, 'schedule-cards must reject placeholder caption');

  // Old landmine path: missing caption previously fell through to `Quote card ${n}`.
  // Even with line1/line2 present, caption is required — no silent fallback string.
  const noFallback = resolveQuoteCardScheduleCopy({
    card_index: 7,
    line1: 'Power says: x',
    line2: 'Servant leadership says: y',
    caption: '',
  });
  assert(!noFallback.ok, 'must not invent Quote card N when caption missing');

  const ok = resolveQuoteCardScheduleCopy({
    card_index: 2,
    caption: 'Real social caption for the card.',
    line1: 'Power says: x',
    line2: 'Servant leadership says: y',
  });
  assert(ok.ok, 'valid caption schedules');
  assert(ok.text === ok.caption, 'text and caption must be identical');
  assert(ok.text === 'Real social caption for the card.', 'publish body is caption, not Quote card N');
  assert(!/^Quote card \d+$/i.test(ok.text), 'must never emit Quote card N');
}

{
  const blocked = assertPublishableScheduledText({
    text: 'Quote card 1',
    caption: 'Real copy here',
  });
  assert(!blocked.ok, 'publish guard blocks placeholder text');
  assert(/Refusing|placeholder/i.test(blocked.error), 'error explains refusal');

  const empty = assertPublishableScheduledText({ text: '   ', caption: '' });
  assert(!empty.ok, 'publish guard blocks empty text');

  const ok = assertPublishableScheduledText({
    text: 'Real leadership is quiet.',
    caption: 'Real leadership is quiet.',
  });
  assert(ok.ok && ok.text === 'Real leadership is quiet.', 'real copy is publishable');
}

console.log('scheduledPostCopy.selftest: all checks passed');
