#!/usr/bin/env node
/**
 * Scratch verification for lib/ao/voiceGuardrails.js
 * Run: node scripts/test-voice-guardrails.mjs
 */

import {
  detectVoiceViolations,
  enforceVoiceGuardrails,
  VOICE_VIOLATIONS,
} from '../lib/ao/voiceGuardrails.js';
import { enforceResponseRules } from '../lib/ao/enforceResponseRules.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const dirty =
  'This is worth sitting with for a moment. Furthermore, it resonates deeply — and unlocks clarity.';
const dirtyHits = detectVoiceViolations(dirty);
assert(dirtyHits.some((h) => h.id === 'worth-sitting-with'), 'detects "worth sitting with"');
assert(dirtyHits.some((h) => h.id === 'furthermore'), 'detects furthermore');
assert(dirtyHits.some((h) => h.id === 'em-dash'), 'detects em dash');
assert(dirtyHits.some((h) => h.id === 'unlock'), 'detects unlock');

// #133 — "something to sit with" family expansion
{
  const sitPhrase =
    'That fork in the road is the whole story compressed into a single moment, and it is something to sit with before moving forward.';
  const sitHits = detectVoiceViolations(sitPhrase);
  assert(
    sitHits.some((h) => h.id === 'something-to-sit-with'),
    'detects "something to sit with"'
  );
  const sitStrip = await enforceVoiceGuardrails(sitPhrase, {
    anthropicClient: {
      messages: {
        create: async () => ({
          content: [{ type: 'text', text: sitPhrase }],
        }),
      },
    },
    contextLabel: 'unit-test-sit-with',
  });
  assert(sitStrip.forced === true || sitStrip.corrected === true, 'sitting phrase is corrected or stripped');
  assert(!/\bsomething\s+to\s+sit\s+with\b/i.test(sitStrip.text), 'forced path removes something-to-sit-with');

  // Existing sitting-family patterns still detect
  assert(
    detectVoiceViolations('This is worth sitting with.').some((h) => h.id === 'worth-sitting-with'),
    'worth-sitting-with unchanged'
  );
  assert(
    detectVoiceViolations('worth sitting in silence').some((h) => h.id === 'worth-sitting-in'),
    'worth-sitting-in unchanged'
  );
  assert(
    detectVoiceViolations('worth sitting on for a bit').some((h) => h.id === 'worth-sitting-on'),
    'worth-sitting-on unchanged'
  );
  assert(
    detectVoiceViolations('Sit with that for a moment.').some((h) => h.id === 'sit-with-that'),
    'sit-with-that unchanged'
  );
}

const clean = 'Short sentences. Direct. Bart wrote this himself.';
assert(detectVoiceViolations(clean).length === 0, 'clean string has zero violations');

// Forced strip path (no API): pass a fake client that always fails
const failingClient = {
  messages: {
    create: async () => {
      throw new Error('forced test failure');
    },
  },
};

const failResult = await enforceVoiceGuardrails(dirty, {
  anthropicClient: failingClient,
  contextLabel: 'unit-test-fail',
});
assert(failResult.text === dirty, 'API failure returns original unmodified');
assert(failResult.corrected === false, 'API failure is not marked corrected');

// Forced strip after two "successful" rewrites that still violate
const stubbornClient = {
  messages: {
    create: async () => ({
      content: [{ type: 'text', text: dirty }],
    }),
  },
};
const stripResult = await enforceVoiceGuardrails(dirty, {
  anthropicClient: stubbornClient,
  contextLabel: 'unit-test-strip',
});
assert(stripResult.corrected === true, 'stubborn rewrite eventually corrects');
assert(stripResult.forced === true, 'stubborn rewrite ends in forced strip');
assert(!/\bworth\s+sitting\s+with\b/i.test(stripResult.text), 'forced strip removed sitting tic');
assert(!/—/.test(stripResult.text), 'forced strip removed em dash');
console.log('BEFORE:', dirty);
console.log('AFTER :', stripResult.text);

// Regression: enforceResponseRules still callable and returns a string (additive layer)
const rulesOut = enforceResponseRules('Plain reply with no signals.', []);
assert(typeof rulesOut === 'string' && rulesOut.includes('Plain reply'), 'enforceResponseRules still returns text unchanged for clean input');

assert(VOICE_VIOLATIONS.length > 20, `seed list is broad (${VOICE_VIOLATIONS.length} rules)`);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll voice guardrail scratch checks passed.');
