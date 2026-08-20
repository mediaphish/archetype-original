#!/usr/bin/env node
/**
 * Direct Image mode — brief detection + reference URL fallback regression.
 * Run: node scripts/test-direct-image-mode.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
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

const { isDirectImageBrief } = await import('../lib/ao/directImageMode.js');
const { resolveGenerateImageReferenceUrls } = await import('../lib/ao/autoToolHandlers.js');

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

function assertEqual(actual, expected, msg) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), msg || `${actual} !== ${expected}`);
}

const bartAug19 =
  'This is the reference image. Generate something similar. Change the room to be a dystopian office setting ' +
  "with neon signs and fog. Put me in a black hoodie — don't touch my face or the logo on the shirt. " +
  'Keep the quote readable and crop it for Instagram.';

assert(
  isDirectImageBrief(bartAug19, { hasAttachmentThisTurn: true }),
  'Bart 2026-08-19 attach + full brief → true'
);

assert(
  !isDirectImageBrief('make me an image', { hasAttachmentThisTurn: true }),
  'vague attach-only → false'
);

assert(
  !isDirectImageBrief(bartAug19, { hasAttachmentThisTurn: false }),
  'full brief without attachment → false'
);

{
  const urls = await resolveGenerateImageReferenceUrls(
    { intent: 'attach_for_reference', prompt_description: 'fix the background' },
    {
      threadId: 'thread-test-123',
      chatAttachedImageUrlsThisTurn: [],
      chatAttachedImageUrlsPrior: ['https://example.com/old-headshot.png'],
      _testLoadLastDirectImageUrl: async () => 'https://example.com/last-direct.png',
    }
  );
  assertEqual(
    urls,
    ['https://example.com/last-direct.png'],
    'Direct Image correction uses last direct result before prior attachment'
  );
}

if (failed > 0) {
  console.error(`\ntest-direct-image-mode: ${failed} check(s) failed`);
  process.exit(1);
}

console.log('test-direct-image-mode: all checks passed');
