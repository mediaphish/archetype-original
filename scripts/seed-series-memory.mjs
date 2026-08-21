/**
 * Seed Auto's series memory from the published corpus.
 *
 * Back-fills what recordSeriesPart will maintain going forward. Detection is
 * derived from real slugs and titles in public/knowledge.json — nothing about a
 * series is invented here, and `intent` is deliberately left empty rather than
 * summarized, since a made-up description of Bart's own series is exactly the
 * kind of confident filler this memory exists to prevent.
 *
 * Usage:
 *   node scripts/seed-series-memory.mjs --dry-run
 *   node scripts/seed-series-memory.mjs
 *   node scripts/seed-series-memory.mjs --email=someone@example.com
 *
 * Safe to re-run: upserts by (email, kind, series key) and rewrites the part
 * list from the corpus each time.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadEnvFile(join(ROOT, '.env.local'));
await loadEnvFile(join(ROOT, '.env'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const EMAIL =
  (args.find((a) => a.startsWith('--email=')) || '').slice(8) ||
  process.env.AO_OWNER_EMAIL ||
  'bart@archetypeoriginal.com';

/**
 * How each series is recognized in the corpus.
 *
 * Explicit rather than inferred: a heuristic that groups by shared slug prefix
 * would also collapse unrelated posts that happen to share an opening word, and
 * silently inventing a series is worse than missing one.
 */
const SERIES = [
  {
    key: 'the-archetype',
    title: 'The Archetype Series',
    match: (d) => /^the-[a-z]+-archetype$/.test(d.slug || ''),
  },
  {
    key: 'the-7-conditions',
    title: 'The 7 Conditions',
    match: (d) => String(d.slug || '').startsWith('ali-series-'),
  },
  {
    key: 'psychology-of-servant-leadership',
    title: 'Psychology of Servant Leadership',
    match: (d) => /^psychology-of-servant-leadership-part-\d+/.test(d.slug || ''),
  },
  {
    key: 'the-case-for-servant-leadership',
    title: 'The Case for Servant Leadership',
    match: (d) => /^the-case-for-servant-leadership-part-\d+/.test(d.slug || ''),
  },
  {
    key: 'power-vs-authority',
    title: 'Power vs. Authority',
    match: (d) => /^power-vs-authority-part-\d+/.test(d.slug || ''),
  },
  {
    key: 'leadership-is-not-a-clenched-fist',
    title: 'Leadership Is Not a Clenched Fist, but a Guiding Hand',
    match: (d) => /^leadership-is-not-a-clenched-fist.*part-\d+/.test(d.slug || ''),
  },
];

function partDate(doc) {
  return String(doc.publish_date || doc.date || '');
}

async function main() {
  const raw = await readFile(join(ROOT, 'public', 'knowledge.json'), 'utf-8');
  const docs = (JSON.parse(raw).docs || []).filter((d) => d.type === 'journal-post');

  console.log(`Owner    : ${EMAIL}`);
  console.log(`Mode     : ${DRY_RUN ? 'DRY RUN — nothing written' : 'live'}`);
  console.log(`Journal  : ${docs.length} posts\n`);

  const plans = SERIES.map((s) => ({
    ...s,
    parts: docs.filter(s.match).sort((a, b) => partDate(a).localeCompare(partDate(b))),
  }));

  for (const plan of plans) {
    console.log(`${plan.title}  (${plan.parts.length} parts)`);
    plan.parts.forEach((d, i) => console.log(`   ${i + 1}. ${partDate(d).slice(0, 10)}  ${d.title}`));
    if (!plan.parts.length) console.log('   (no matching posts — skipped)');
    console.log('');
  }

  const total = plans.reduce((n, p) => n + p.parts.length, 0);
  console.log(`Total parts: ${total}`);
  if (DRY_RUN) return;

  const { upsertSeries, recordSeriesPart } = await import('../lib/ao/seriesMemory.js');

  let written = 0;
  for (const plan of plans) {
    if (!plan.parts.length) continue;

    const created = await upsertSeries({ email: EMAIL, seriesKey: plan.key, title: plan.title });
    if (!created.ok) {
      console.error(`  FAILED ${plan.key}: ${created.error}`);
      continue;
    }

    let n = 1;
    for (const doc of plan.parts) {
      const res = await recordSeriesPart({
        email: EMAIL,
        seriesKey: plan.key,
        seriesTitle: plan.title,
        partNumber: n++,
        slug: doc.slug,
        title: doc.title,
        status: 'published',
        publishedAt: partDate(doc) || null,
      });
      if (!res.ok) console.error(`  FAILED ${doc.slug}: ${res.error}`);
      else written++;
    }
    console.log(`  stored ${plan.title}`);
  }

  console.log(`\nDone. ${written} parts recorded across ${plans.filter((p) => p.parts.length).length} series.`);
  console.log('intent is intentionally blank — fill it from Bart, do not summarize it for him.');
}

main().catch((err) => {
  console.error('\nFatal error:', err?.message || err);
  process.exit(1);
});
