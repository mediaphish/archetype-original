/**
 * Fails the build if anything calls OpenAI for text.
 *
 * Bart's rule, 2026-08-20 and again 2026-09-23: "The only thing we leave with
 * OpenAI is image creation. Period." It held in intent and not in code. Twenty
 * text call sites ran gpt-4o-mini in production for months, each with its own
 * raw fetch and its own `process.env.SOME_MODEL || 'gpt-4o-mini'` fallback, and
 * nothing anywhere would have told him.
 *
 * Text generation belongs to Claude, through lib/ao/textModel.js. What this
 * catches:
 *   - any call to OpenAI's chat/completions or responses endpoints
 *   - any gpt-* model string outside the image allowlist
 *
 * Allowed: image generation (gpt-image-1) and embeddings
 * (text-embedding-3-small). Bart settled that on 2026-09-23: OpenAI covers what
 * Anthropic does not sell, which is pixels and vectors. Anything that produces
 * words a human reads is Claude. Embeddings produce no prose, and there is no
 * Claude embedding model, so moving them would mean adding a third vendor
 * rather than consolidating.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['lib', 'api', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

/** Files allowed to talk to OpenAI, and what for. */
const ALLOWED = new Map([
  ['lib/ao/generateDesignImage.js', 'image generation'],
  ['lib/ao/generateQuoteCardImage.js', 'image generation'],
  ['lib/ao/generatePlateCard.js', 'image generation'],
  ['lib/ao/generateLikenessCard.js', 'image generation'],
  ['lib/ao/generateReshareCardImage.js', 'image generation'],
  ['lib/ao/rapidWriteImage.js', 'image generation'],
  ['lib/ao/recentApprovedHeader.js', 'image generation'],
  ['lib/ao/corpusEmbeddings.js', 'embeddings: no Claude equivalent exists'],
  ['lib/openaiKey.js', 'the key helper itself'],
  ['scripts/verify-no-openai-text.mjs', 'this check'],
  ['lib/ao/textModel.js', 'names the old model in its comment and its error guidance'],
  ['lib/__tests__/textModel.test.js', 'uses the old model name as the rejection fixture'],
]);

const TEXT_ENDPOINT = /api\.openai\.com\/v1\/(?:chat\/completions|responses|completions)/;
const TEXT_MODEL = /['"]((?:gpt|o1|o3|o4)-[a-z0-9.\-]+)['"]/gi;
const IMAGE_MODELS = /^gpt-image/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const failures = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = file.split(path.sep).join('/');
    if (ALLOWED.has(rel)) continue;
    scanned += 1;
    const text = fs.readFileSync(file, 'utf8');

    if (TEXT_ENDPOINT.test(text)) {
      failures.push(`${rel}\n    calls an OpenAI text endpoint directly`);
    }

    TEXT_MODEL.lastIndex = 0;
    const models = new Set();
    let match;
    while ((match = TEXT_MODEL.exec(text)) !== null) {
      if (!IMAGE_MODELS.test(match[1])) models.add(match[1]);
    }
    if (models.size) {
      failures.push(`${rel}\n    names an OpenAI text model: ${[...models].join(', ')}`);
    }
  }
}

if (failures.length) {
  console.error('\nOpenAI is for image creation only. These call it for text:\n');
  console.error(failures.join('\n\n'));
  console.error(
    '\nText generation goes through lib/ao/textModel.js (Claude). If a file genuinely needs' +
      '\nOpenAI for images, add it to the allowlist in scripts/verify-no-openai-text.mjs with' +
      '\nthe reason.\n'
  );
  process.exit(1);
}

console.log(`verify-no-openai-text: OK (${scanned} files, OpenAI only in the ${ALLOWED.size} allowlisted image paths)`);
