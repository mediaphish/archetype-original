/**
 * Regression: model-authored [IMAGE_GENERATED] tags must be stripped before
 * server-side append logic runs (prompt 7).
 * Run: node lib/ao/chatImageGeneratedStrip.selftest.mjs
 */

function stripModelAuthoredImageGeneratedTags(reply) {
  return String(reply || '').replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '').trim();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  const out = stripModelAuthoredImageGeneratedTags(
    'Done.\n[IMAGE_GENERATED label="fake" url="https://example.com/x.png" size="1536x1024"]'
  );
  assert(!/\[IMAGE_GENERATED/i.test(out), 'fabricated tag must be removed');
  assert(out.startsWith('Done.'), 'surrounding prose must remain');
}

{
  const out = stripModelAuthoredImageGeneratedTags(
    '[IMAGE_GENERATED]\nSecond paragraph.'
  );
  assert(!/\[IMAGE_GENERATED/i.test(out), 'bare fabricated tag must be removed');
  assert(out.includes('Second paragraph'), 'remaining text must survive');
}

console.log('chatImageGeneratedStrip.selftest: all checks passed');
