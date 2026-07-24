/**
 * Long-form truncation fix — verification script.
 *
 * 1) Unit test: mock client simulates max_tokens then end_turn (auto-continue).
 * 2) Live test (if ANTHROPIC_API_KEY set): runAutoChat with a long-form prompt.
 *
 * Usage: node scripts/test-longform-truncation.mjs
 */

import { createCompleteMessage } from '../lib/ao/anthropicCompleteMessage.js';
import { runAutoChat } from '../lib/ao/autoV2.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testMockContinuation() {
  let call = 0;
  const mockClient = {
    messages: {
      create: async () => {
        call += 1;
        if (call === 1) {
          return {
            stop_reason: 'max_tokens',
            content: [{ type: 'text', text: 'PART_ONE' }],
            usage: { input_tokens: 10, output_tokens: 100 },
          };
        }
        return {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'PART_TWO' }],
          usage: { input_tokens: 20, output_tokens: 50 },
        };
      },
    },
  };

  const result = await createCompleteMessage(mockClient, {
    model: 'claude-sonnet-4-6',
    messages: [{ role: 'user', content: 'Write a long post.' }],
  });

  assert(result.ok === true, 'mock continuation should succeed');
  assert(result.text === 'PART_ONEPART_TWO', `stitched text wrong: ${result.text}`);
  assert(result.continuation_count === 1, 'expected one continuation');
  assert(call === 2, `expected 2 API calls, got ${call}`);
  console.log('✓ Mock continuation test passed');
}

async function testMockIncompleteCap() {
  let call = 0;
  const mockClient = {
    messages: {
      create: async () => {
        call += 1;
        return {
          stop_reason: 'max_tokens',
          content: [{ type: 'text', text: `chunk${call}` }],
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  };

  const result = await createCompleteMessage(
    mockClient,
    { model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'Go' }] },
    { maxContinuations: 2 }
  );

  assert(result.ok === false, 'should fail when continuation cap hit');
  assert(result.error === 'incomplete_response', 'expected incomplete_response error');
  assert(!result.message?.includes('PART'), 'error message should be user-facing');
  console.log('✓ Mock incomplete cap test passed');
}

async function testLiveLongform() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⊘ Skipping live API test (ANTHROPIC_API_KEY not set)');
    return;
  }

  const prompt = `Write a complete long-form journal blog post about servant leadership in manufacturing teams. Requirements:
- At least 3,500 words
- Use markdown headings (## and ###)
- Include a clear opening, five major sections with examples, and a closing paragraph that lands the point
- End the post with this exact closing line on its own paragraph: END_OF_POST_MARKER
- Do not stop early. Deliver the full post in one response.`;

  console.log('… Live long-form test (this may take 1–3 minutes)');
  const started = Date.now();
  const result = await runAutoChat([], prompt);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  assert(result.ok === true, `runAutoChat failed: ${result.error}`);
  assert(typeof result.reply === 'string', 'reply must be a string');
  assert(result.reply.length > 12000, `reply too short (${result.reply.length} chars) — likely truncated`);
  assert(
    result.reply.includes('END_OF_POST_MARKER'),
    'reply missing END_OF_POST_MARKER — post was cut off before the required closing line'
  );

  console.log(
    `✓ Live long-form test passed (${result.reply.length} chars, ${elapsed}s, continuations: ${result.continuation_count || 0})`
  );
}

async function main() {
  await testMockContinuation();
  await testMockIncompleteCap();
  await testLiveLongform();
  console.log('\nAll long-form truncation tests passed.');
}

main().catch((err) => {
  console.error('\n✗ Test failed:', err.message || err);
  process.exit(1);
});
