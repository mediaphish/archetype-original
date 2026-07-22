#!/usr/bin/env node
/**
 * Audit: published journal posts missing from ao_corpus_embeddings.
 *
 * Compares every published top-level journal markdown file against the
 * vector corpus table Auto uses for its FULL CORPUS INDEX.
 *
 * Usage:
 *   npm run audit:corpus
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (loads .env.local / .env when present)
 *
 * Prints to stdout only — no report file.
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const JOURNAL_DIR = join(ROOT, 'ao-knowledge-hq-kit/journal');

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

const missingEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

async function loadPublishedJournalPosts() {
  const entries = await readdir(JOURNAL_DIR, { withFileTypes: true });
  const posts = [];

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    const lower = ent.name.toLowerCase();
    if (lower.includes('template')) continue;
    if (ent.name.endsWith('.md.md')) continue;
    if (ent.name.startsWith('.')) continue;

    const filePath = join(JOURNAL_DIR, ent.name);
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.startsWith('---')) continue;

    let data;
    try {
      data = matter(raw).data || {};
    } catch {
      continue;
    }

    if (String(data.status || '').toLowerCase() !== 'published') continue;

    const slug = String(data.slug || ent.name.replace(/\.md$/i, '')).trim();
    const title = String(data.title || slug).trim();
    if (!slug) continue;

    posts.push({ slug, title, file: ent.name });
  }

  posts.sort((a, b) => a.slug.localeCompare(b.slug));
  return posts;
}

async function loadCorpusSlugs() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const slugs = new Set();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('ao_corpus_embeddings')
      .select('slug')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to read ao_corpus_embeddings: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const slug = String(row.slug || '').trim();
      if (slug) slugs.add(slug);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return slugs;
}

async function main() {
  const published = await loadPublishedJournalPosts();
  const corpusSlugs = await loadCorpusSlugs();

  const missing = published.filter((p) => !corpusSlugs.has(p.slug));

  console.log('Corpus completeness audit');
  console.log('------------------------');
  console.log(`Published journal posts on disk: ${published.length}`);
  console.log(`Rows in ao_corpus_embeddings:    ${corpusSlugs.size}`);
  console.log(`Missing from corpus embeddings:  ${missing.length}`);
  console.log('');

  if (missing.length === 0) {
    console.log('All clear — every published journal post has a corpus embedding row.');
    process.exit(0);
  }

  console.log('Published posts missing from ao_corpus_embeddings:');
  for (const p of missing) {
    console.log(`- ${p.slug} — ${p.title} (${p.file})`);
  }
  process.exit(2);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
