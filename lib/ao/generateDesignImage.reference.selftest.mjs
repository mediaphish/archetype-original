/**
 * Regression: generateDesignImage routes to /v1/images/edits when references
 * are present, and /v1/images/generations when not. Also covers resurface plan.
 *
 * Run: node lib/ao/generateDesignImage.reference.selftest.mjs
 */
import assert from 'assert';
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

// Tiny valid-ish PNG (1x1) so buffer length checks pass
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const {
  generateDesignImage,
  __setGenerateDesignImageFetchOverride,
  OPENAI_IMAGES_EDITS_URL,
  OPENAI_IMAGES_GENERATIONS_URL,
  MAX_REFERENCE_IMAGES,
  resolveReferenceImages,
} = await import('./generateDesignImage.js');

const { buildResurfaceImagePlan, pickBartPhotoUrl, BART_PHOTO_FILENAMES } = await import(
  './bartPhotoReferences.js'
);

function mockOpenAiSuccess(url, options) {
  const calls = mockOpenAiSuccess.calls;
  calls.push({ url, options });
  // 1x1 png as b64
  return {
    ok: true,
    async json() {
      return {
        data: [
          {
            b64_json: TINY_PNG.toString('base64'),
          },
        ],
      };
    },
    async text() {
      return '';
    },
  };
}
mockOpenAiSuccess.calls = [];

// Stub storage upload by monkey-patching via env absence path — instead mock
// at fetch only and stub supabase by short-circuiting upload: we override
// generateDesignImage's upload by intercepting after OpenAI. Easiest: set
// SUPABASE and mock storage... For unit test, patch upload through a fake
// response that still hits upload — without supabase the upload fails.
// So: provide a fetch override AND temporarily stub supabaseAdmin.storage
// by setting a test hook... Simpler approach: only assert which URL was
// called and that FormData had image parts, before upload — intercept and
// return early by making upload succeed via mock module.
//
// Practical approach: mock fetch; mock supabase by dynamic import of a
// patched generateDesignImage path that checks endpoint before upload.
// We'll assert on the captured fetch call URL + FormData entries, then
// let upload fail OR mock supabaseAdmin.

const supabaseAdminMod = await import('../supabase-admin.js');
const originalStorage = supabaseAdminMod.supabaseAdmin.storage;
supabaseAdminMod.supabaseAdmin.storage = {
  from() {
    return {
      async upload() {
        return { error: null };
      },
      getPublicUrl(storagePath) {
        return {
          data: {
            publicUrl: `https://example.test/storage/${storagePath}`,
          },
        };
      },
    };
  },
};

async function main() {
  assert.strictEqual(MAX_REFERENCE_IMAGES, 16, 'OpenAI gpt-image edits max is 16');

  // Cap exceeded → clear error, no silent truncate
  const tooMany = await resolveReferenceImages({
    referenceImageBuffers: Array.from({ length: 17 }, () => TINY_PNG),
  });
  assert.strictEqual(tooMany.ok, false);
  assert.match(tooMany.error, /at most 16/i);

  __setGenerateDesignImageFetchOverride(mockOpenAiSuccess);
  mockOpenAiSuccess.calls = [];

  // 1) With references → edits endpoint + image attached
  if (!process.env.OPEN_API_KEY) process.env.OPEN_API_KEY = 'test-key-for-selftest';
  const withRef = await generateDesignImage({
    prompt: 'Continue this style',
    content_type: 'journal_header',
    title: 'Selftest',
    referenceImageBuffers: [TINY_PNG],
  });
  assert.strictEqual(withRef.ok, true, withRef.error || 'withRef failed');
  assert.strictEqual(withRef.endpoint, OPENAI_IMAGES_EDITS_URL);
  assert.strictEqual(withRef.reference_count, 1);
  assert.strictEqual(mockOpenAiSuccess.calls.length, 1);
  assert.strictEqual(mockOpenAiSuccess.calls[0].url, OPENAI_IMAGES_EDITS_URL);
  const body = mockOpenAiSuccess.calls[0].options.body;
  assert.ok(body instanceof FormData, 'edits request must be multipart FormData');
  // FormData in Node: iterate entries
  let imageParts = 0;
  for (const [key] of body.entries()) {
    if (key === 'image') imageParts += 1;
  }
  assert.ok(imageParts >= 1, 'FormData must include image part(s)');

  // 2) No references → generations endpoint unchanged
  mockOpenAiSuccess.calls = [];
  const noRef = await generateDesignImage({
    prompt: 'Text only header',
    content_type: 'journal_header',
    title: 'Selftest 2',
  });
  assert.strictEqual(noRef.ok, true, noRef.error || 'noRef failed');
  assert.strictEqual(noRef.endpoint, OPENAI_IMAGES_GENERATIONS_URL);
  assert.strictEqual(noRef.reference_count, 0);
  assert.strictEqual(mockOpenAiSuccess.calls[0].url, OPENAI_IMAGES_GENERATIONS_URL);
  assert.strictEqual(typeof mockOpenAiSuccess.calls[0].options.body, 'string');
  const parsed = JSON.parse(mockOpenAiSuccess.calls[0].options.body);
  assert.strictEqual(parsed.model, 'gpt-image-1');
  assert.strictEqual(
    parsed.prompt,
    'Text only header',
    'explicit prompt must be sent as written, without brand-style append'
  );
  assert.ok(
    !/Color palette: Dark backgrounds/i.test(parsed.prompt),
    'explicit prompt must not include BRAND_CONTEXT palette'
  );
  assert.ok(
    !/handshakes/i.test(parsed.prompt),
    'explicit prompt must not include BRAND_CONTEXT avoid-list'
  );

  mockOpenAiSuccess.calls = [];
  const fallback = await generateDesignImage({
    prompt: '',
    content_type: 'journal_header',
    title: 'Selftest fallback',
  });
  assert.strictEqual(fallback.ok, true, fallback.error || 'fallback failed');
  const parsedFallback = JSON.parse(mockOpenAiSuccess.calls[0].options.body);
  assert.match(
    parsedFallback.prompt,
    /Color palette: Dark backgrounds/i,
    'generic journal_header fallback still uses BRAND_CONTEXT'
  );

  // 3) Resurface plan: real Bart photo + quote + edits path
  const photo = pickBartPhotoUrl({ mood: 'serious' });
  assert.ok(photo, 'expected a Bart photo URL');
  assert.ok(/\/images\//.test(photo), photo);
  assert.ok(
    BART_PHOTO_FILENAMES.some((n) => photo.endsWith(n)),
    'photo should be from known Bart set'
  );

  const plan = buildResurfaceImagePlan({
    title: 'Scoreboard Leadership',
    pullQuote: 'The number becomes the mission.',
    mood: 'serious',
  });
  assert.strictEqual(plan.content_type, 'resurface');
  assert.strictEqual(plan.size, '4:3');
  assert.ok(plan.reference_image_urls.length >= 1);
  assert.match(plan.prompt_description, /The number becomes the mission/);

  mockOpenAiSuccess.calls = [];
  // Simulate resurface generation with buffer (skip live photo download)
  const resurface = await generateDesignImage({
    prompt: plan.prompt_description,
    content_type: plan.content_type,
    size: plan.size,
    title: 'Scoreboard Leadership',
    referenceImageBuffers: [TINY_PNG],
  });
  assert.strictEqual(resurface.ok, true, resurface.error || 'resurface failed');
  assert.strictEqual(resurface.endpoint, OPENAI_IMAGES_EDITS_URL);
  assert.strictEqual(mockOpenAiSuccess.calls[0].url, OPENAI_IMAGES_EDITS_URL);

  console.log('generateDesignImage.reference.selftest: PASS');
}

main()
  .catch((err) => {
    console.error('FAIL:', err);
    process.exit(1);
  })
  .finally(() => {
    __setGenerateDesignImageFetchOverride(null);
    supabaseAdminMod.supabaseAdmin.storage = originalStorage;
  });
