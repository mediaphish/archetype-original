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

const { resolveGenerateImageReferenceUrls } = await import('./autoToolHandlers.js');

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

console.log('autoToolHandlers.generateImageRefs.selftest: all checks passed');
