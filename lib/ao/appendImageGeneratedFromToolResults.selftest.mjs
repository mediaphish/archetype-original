/**
 * Regression: generate_image tool results must produce [IMAGE_GENERATED] for the
 * artifact panel (same client signal as the legacy DALLE path).
 *
 * Run: node lib/ao/appendImageGeneratedFromToolResults.selftest.mjs
 */
import assert from 'assert';
import { appendImageGeneratedFromToolResults } from './appendImageGeneratedFromToolResults.js';

function extractDesignImages(content) {
  const text = String(content || '');
  const pattern = /\[IMAGE_GENERATED([^\]]*)\]/gi;
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const attrs = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = attrPattern.exec(match[1])) !== null) {
      attrs[m[1]] = m[2];
    }
    if (attrs.url) {
      results.push({
        label: attrs.label || 'Generated Image',
        url: attrs.url,
        size: attrs.size || '',
      });
    }
  }
  return results;
}

const SAMPLE_URL =
  'https://example.supabase.co/storage/v1/object/public/ao-images/the-standard-that-held.png';

// Test 1: successful generate_image tool result → IMAGE_GENERATED tag
{
  const reply = 'Here is the header image for the post.';
  const { reply: out, appended } = appendImageGeneratedFromToolResults(reply, [
    {
      name: 'generate_image',
      result: {
        ok: true,
        slug: 'the-standard-that-held',
        image_url: SAMPLE_URL,
        size: '1536x1024',
      },
    },
  ]);
  assert.strictEqual(appended.length, 1);
  assert.ok(
    /\[IMAGE_GENERATED label="the-standard-that-held" url="[^"]+" size="1536x1024"\]/.test(out),
    `expected well-formed IMAGE_GENERATED tag, got: ${out}`
  );
  assert.ok(out.includes(SAMPLE_URL));
  assert.ok(out.endsWith(']'), 'tag should be at end of reply');

  // Test 4 (client parse parity): same regex as AutoV2Panel extractDesignImagesFromAssistantContent
  const parsed = extractDesignImages(out);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].url, SAMPLE_URL);
  assert.strictEqual(parsed[0].label, 'the-standard-that-held');
  assert.strictEqual(parsed[0].size, '1536x1024');
}

// Test 2: failed generate_image → no tag
{
  const reply = 'Generation failed; trying again.';
  const { reply: out, appended } = appendImageGeneratedFromToolResults(reply, [
    {
      name: 'generate_image',
      result: { ok: false, error: 'upstream failed' },
    },
  ]);
  assert.strictEqual(appended.length, 0);
  assert.ok(!/\[IMAGE_GENERATED/i.test(out), 'failed tool must not append IMAGE_GENERATED');
}

// Strips leftover DALLE_GENERATE when bridging tool results
{
  const reply = 'Working.\n[DALLE_GENERATE prompt="x" label="y"]';
  const { reply: out } = appendImageGeneratedFromToolResults(reply, [
    {
      name: 'generate_image',
      result: { ok: true, slug: 'y', image_url: SAMPLE_URL, size: '1024x1024' },
    },
  ]);
  assert.ok(!/\[DALLE_GENERATE/i.test(out), 'legacy DALLE tag must be stripped');
  assert.ok(/\[IMAGE_GENERATED/i.test(out));
}

// Dedupe: do not double-append same URL
{
  const reply = `Already shown.\n[IMAGE_GENERATED label="x" url="${SAMPLE_URL}" size="1536x1024"]`;
  const { reply: out, appended } = appendImageGeneratedFromToolResults(reply, [
    {
      name: 'generate_image',
      result: { ok: true, slug: 'x', image_url: SAMPLE_URL },
    },
  ]);
  assert.strictEqual(appended.length, 0);
  assert.strictEqual((out.match(/\[IMAGE_GENERATED/gi) || []).length, 1);
}

// Test 3 note: legacy path is the else branch in chat.js — when generate_image
// is NOT in toolsUsedThisTurn, appendDesignImageToReplyIfNeeded still runs.
// Confirmed by reading chat.js: tool branch only calls this helper; else unchanged.

console.log('appendImageGeneratedFromToolResults.selftest: PASS');
