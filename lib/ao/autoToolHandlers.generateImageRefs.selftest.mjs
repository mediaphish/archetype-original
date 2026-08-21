/**
 * Regression: generate_image reference URL fallbacks (prompts 4 + 5).
 * Run: node lib/ao/autoToolHandlers.generateImageRefs.selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const { resolveGenerateImageReferenceUrls, resolveVerificationReferenceUrls } = await import(
  './autoToolHandlers.js'
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), msg || `${actual} !== ${expected}`);
}

{
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'header_image_for_post', prompt_description: 'test', slug: 'x' },
    { chatAttachedImageUrlsThisTurn: ['https://example.com/this-turn.png'] }
  );
  assertEqual(urls, ['https://example.com/this-turn.png']);
}

{
  const urls = await resolveGenerateImageReferenceUrls(
    {
      intent: 'header_image_for_post',
      prompt_description: 'cover the tattoo',
      slug: 'signal-post',
    },
    {
      email: 'bart@archetypeoriginal.com',
      chatAttachedImageUrlsPrior: ['https://example.com/old-headshot.png'],
      _testGetBySlug: async () => ({
        ok: true,
        data: { image_url: 'https://example.com/current-header.png' },
      }),
    }
  );
  assertEqual(urls, ['https://example.com/current-header.png']);
}

{
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'attach_for_reference', prompt_description: 'test' },
    { chatAttachedImageUrlsPrior: ['https://example.com/prior.png'] }
  );
  assertEqual(urls, ['https://example.com/prior.png']);
}

{
  const urls = await resolveGenerateImageReferenceUrls(
    {
      intent: 'header_image_for_post',
      prompt_description: 'test',
      slug: 'y',
      reference_image_urls: ['https://example.com/explicit.png'],
    },
    { chatAttachedImageUrlsThisTurn: ['https://example.com/ignored.png'] }
  );
  assertEqual(urls, ['https://example.com/explicit.png']);
}

{
  const urls = await resolveVerificationReferenceUrls(
    ['https://example.com/last-generated.png'],
    {
      threadId: 'thread-test-123',
      chatAttachedImageUrlsThisTurn: [],
      _testLoadOriginalChatAttachedImageUrl: async () => 'https://example.com/real-photo.png',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/real-photo.png'],
    'verification anchors on real upload, not last AI output'
  );
}

{
  const urls = await resolveVerificationReferenceUrls(
    ['https://example.com/last-generated.png'],
    {
      threadId: 'thread-test-123',
      chatAttachedImageUrlsThisTurn: ['https://example.com/new-upload.png'],
      _testLoadOriginalChatAttachedImageUrl: async () => 'https://example.com/old-upload.png',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/new-upload.png'],
    'this-turn real attachment wins over older thread original'
  );
}

{
  const urls = await resolveVerificationReferenceUrls(
    ['https://example.com/bart-87.jpg'],
    { threadId: null, chatAttachedImageUrlsThisTurn: [] }
  );
  assertEqual(
    urls,
    ['https://example.com/bart-87.jpg'],
    'no chat original: fall back to generation refs (resurface photo)'
  );
}

// --- approved-card fallback for a brand-new quote card ---
//
// Bart: Auto "fails on any image that has me in it." Series headers are
// painterly scenes and succeed; the cards — his face, the brand type, the logo
// — are the ones he ends up making by hand. Before this fallback existed a
// brand-new card matched nothing in the chain and generated with zero
// references: the activity log for "the-signal-i-was-actually-watching" shows
// attempt one as images/generations with reference_count 0.
{
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'header_image_for_post', slug: 'a-brand-new-post', content_type: 'journal_header' },
    {
      email: 'bart@archetypeoriginal.com',
      _testGetBySlug: async () => ({ ok: true, data: { image_url: null } }),
      _testLoadRecentApprovedHeaderUrl: async () =>
        'https://example.com/manual-upload-prior-card.jpg',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/manual-upload-prior-card.jpg'],
    'brand-new card references a previously approved card instead of generating blind'
  );
}

{
  // A correction round should edit THIS post's image, not restart from another
  // post's card, so the existing-header branch must still win.
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'header_image_for_post', slug: 'post-being-corrected' },
    {
      email: 'bart@archetypeoriginal.com',
      _testGetBySlug: async () => ({
        ok: true,
        data: { image_url: 'https://example.com/this-posts-header.png' },
      }),
      _testLoadRecentApprovedHeaderUrl: async () =>
        'https://example.com/manual-upload-prior-card.jpg',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/this-posts-header.png'],
    'correction round keeps editing this post, not a different approved card'
  );
}

{
  // Series memory beats the generic card fallback.
  //
  // The drafts table records every Archetype entry as its own one-part series
  // (series_slug = its own slug, part_number 1), so the input.series_slug branch
  // never fires for them. Without this ordering, the-jezebel-archetype would
  // inherit a LIKENESS card while the Archetype headers are painterly biblical
  // scenes — verified against the real store: Jezebel resolves to
  // the-archetype and picks up the-ruth-archetype's header.
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'header_image_for_post', slug: 'the-jezebel-archetype', title: 'The Jezebel Archetype' },
    {
      email: 'bart@archetypeoriginal.com',
      _testGetBySlug: async () => ({ ok: true, data: { image_url: null } }),
      _testLoadPriorPartImageUrl: async () => ({
        imageUrl: 'https://example.com/ruth-painterly.png',
        fromSlug: 'the-ruth-archetype',
        seriesKey: 'the-archetype',
      }),
      _testLoadRecentApprovedHeaderUrl: async () =>
        'https://example.com/manual-upload-likeness-card.jpg',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/ruth-painterly.png'],
    'a series entry inherits the prior part, not a likeness card'
  );
}

{
  // No real card yet: fall through rather than reference a scene illustration.
  // Handing a Barnabas oil painting to a card generation teaches the wrong
  // thing, so "closest available" is worse than nothing here.
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'header_image_for_post', slug: 'a-brand-new-post' },
    {
      email: 'bart@archetypeoriginal.com',
      _testGetBySlug: async () => ({ ok: true, data: { image_url: null } }),
      _testLoadRecentApprovedHeaderUrl: async () => null,
    }
  );
  assertEqual(urls, [], 'no approved card: no reference rather than a misleading one');
}

console.log('autoToolHandlers.generateImageRefs.selftest: all checks passed');
