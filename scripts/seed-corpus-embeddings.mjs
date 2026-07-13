/**
 * Seed the ao_corpus_embeddings table from knowledge.json.
 *
 * Run once to populate the vector database with all existing corpus documents.
 * After this runs, new documents are embedded automatically on publish.
 *
 * Usage:
 *   node scripts/seed-corpus-embeddings.mjs
 *
 * Requires environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (or OPEN_API_KEY)
 *
 * Will skip documents that are already embedded (upsert by slug).
 * Safe to run multiple times.
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

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
  console.error('Missing OPENAI_API_KEY or OPEN_API_KEY');
  process.exit(1);
}

async function main() {
  console.log('Loading knowledge.json...');

  let knowledgeDocs;
  try {
    const raw = await readFile(join(ROOT, 'public', 'knowledge.json'), 'utf-8');
    const data = JSON.parse(raw);
    knowledgeDocs = Array.isArray(data.docs) ? data.docs : [];
  } catch (err) {
    console.error('Failed to read knowledge.json:', err.message);
    process.exit(1);
  }

  console.log(`Found ${knowledgeDocs.length} documents to embed.`);
  console.log('Starting embedding process...\n');

  const { seedCorpusFromKnowledgeJson } = await import('../lib/ao/corpusEmbeddings.js');

  const startTime = Date.now();

  const result = await seedCorpusFromKnowledgeJson(knowledgeDocs, {
    batchSize: 5,
    delayMs: 300,
    onProgress: ({ processed, succeeded, failed, total }) => {
      const pct = Math.round((processed / total) * 100);
      process.stdout.write(`\r[${pct}%] ${processed}/${total} — ${succeeded} succeeded, ${failed} failed`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\nDone in ${elapsed}s.`);
  console.log(`Processed: ${result.processed}`);
  console.log(`Succeeded: ${result.succeeded}`);
  console.log(`Failed:    ${result.failed}`);

  if (result.failed > 0) {
    console.log('\nSome documents failed to embed. Check the logs above.');
    console.log('Run the script again to retry — it will skip already-embedded documents.');
  } else {
    console.log('\nAll documents embedded successfully.');
    console.log('The corpus vector database is ready.');
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message || err);
  process.exit(1);
});
