/**
 * Seed ao_corpus_chunks from knowledge.json.
 *
 * Chunks every corpus document into passages, embeds each passage, and stores
 * the passage text whole — so retrieval can return the part of a document that
 * answers a question rather than the document's first 3000 characters.
 *
 * Usage:
 *   node scripts/seed-corpus-chunks.mjs            # embed everything
 *   node scripts/seed-corpus-chunks.mjs --slug=x   # one document
 *   node scripts/seed-corpus-chunks.mjs --limit=20 # first N documents
 *   node scripts/seed-corpus-chunks.mjs --dry-run  # chunk only, no API calls
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY
 * (or OPEN_API_KEY) — read from .env.local / .env, same as the sibling script.
 *
 * Safe to re-run: upserts by (slug, chunk_index) and prunes stale trailing
 * chunks left by a previous, longer revision of a document.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Lightweight .env loader (no dotenv dependency required). */
async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = await readFile(filePath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadEnvFile(join(ROOT, '.env.local'));
await loadEnvFile(join(ROOT, '.env'));

const args = process.argv.slice(2);
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const DRY_RUN = args.includes('--dry-run');
const ONLY_SLUG = argValue('slug');
const LIMIT = Number(argValue('limit')) || 0;
const CONCURRENCY = Math.max(1, Number(argValue('concurrency')) || 4);

if (!DRY_RUN) {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
    console.error('Missing OPENAI_API_KEY or OPEN_API_KEY');
    process.exit(1);
  }
}

async function main() {
  const raw = await readFile(join(ROOT, 'public', 'knowledge.json'), 'utf-8');
  const parsed = JSON.parse(raw);
  let docs = (Array.isArray(parsed.docs) ? parsed.docs : []).filter((d) => (d.body || '').trim());

  if (ONLY_SLUG) docs = docs.filter((d) => d.slug === ONLY_SLUG);
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  if (docs.length === 0) {
    console.error('No documents matched.');
    process.exit(1);
  }

  const { chunkText } = await import('../lib/ao/chunkText.js');
  const plannedChunks = docs.reduce((sum, d) => sum + chunkText(d.body).length, 0);

  console.log(`Documents : ${docs.length}`);
  console.log(`Chunks    : ${plannedChunks}`);
  console.log(`Mode      : ${DRY_RUN ? 'DRY RUN — no API calls, nothing written' : 'live'}`);
  console.log('');

  if (DRY_RUN) {
    const biggest = docs
      .map((d) => ({ slug: d.slug, n: chunkText(d.body).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
    console.log('Largest documents by chunk count:');
    for (const b of biggest) console.log(`  ${String(b.n).padStart(4)}  ${b.slug}`);
    return;
  }

  const { embedAndStoreChunks } = await import('../lib/ao/corpusChunks.js');

  let done = 0;
  let storedChunks = 0;
  let failedChunks = 0;
  const failedDocs = [];
  const started = Date.now();

  const queue = [...docs];
  async function worker() {
    for (;;) {
      const doc = queue.shift();
      if (!doc) return;
      const result = await embedAndStoreChunks(doc);
      done++;
      storedChunks += result.chunks;
      failedChunks += result.failed;
      if (!result.ok) failedDocs.push(doc.slug);
      const pct = Math.round((done / docs.length) * 100);
      process.stdout.write(
        `\r[${pct}%] ${done}/${docs.length} docs — ${storedChunks} chunks stored, ${failedChunks} failed`
      );
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n\nDone in ${elapsed}s.`);
  console.log(`Documents processed : ${done}`);
  console.log(`Chunks stored       : ${storedChunks}`);
  console.log(`Chunks failed       : ${failedChunks}`);

  if (failedDocs.length > 0) {
    console.log(`\n${failedDocs.length} document(s) had failures:`);
    for (const slug of failedDocs.slice(0, 20)) console.log(`  - ${slug}`);
    if (failedDocs.length > 20) console.log(`  ...and ${failedDocs.length - 20} more`);
    console.log('\nRe-run to retry — upsert makes this safe.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err?.message || err);
  process.exit(1);
});
