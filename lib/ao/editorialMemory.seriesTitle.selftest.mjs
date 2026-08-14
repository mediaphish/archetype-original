/**
 * Regression: image_series memory must store the real post title, never a
 * synthesized "<seriesSlug> — Part N" franchise label. Title corrections via
 * saveDraft must refresh the matching memory row immediately.
 *
 * Run: node lib/ao/editorialMemory.seriesTitle.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../supabase-admin.js';
import {
  storeImageSeriesMemory,
  refreshImageSeriesMemoryTitle,
} from './editorialMemory.js';
import { saveDraft, contentDrafts, canonicalizeSlug } from '../db/contentDrafts.js';
import { contentDraftVersions } from '../db/contentDraftVersions.js';

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

const TEST_EMAIL = process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com';
const stamp = Date.now();
const SERIES = canonicalizeSlug(`series-title-fix-${stamp}`);
const PART_SLUG = canonicalizeSlug(`${SERIES}-the-standard-that-held`);
const IMAGE_URL = `https://example.supabase.co/storage/v1/object/public/ao-images/${PART_SLUG}.png`;

async function cleanup() {
  const email = TEST_EMAIL.toLowerCase().trim();
  await supabaseAdmin
    .from('ao_editorial_memory_items')
    .delete()
    .eq('created_by_email', email)
    .eq('kind', 'image_series')
    .eq('source_url_or_slug', PART_SLUG);

  const { data: rows } = await contentDrafts()
    .select('id')
    .eq('created_by_email', email)
    .eq('slug', PART_SLUG)
    .eq('kind', 'journal');
  for (const row of rows || []) {
    await contentDraftVersions().delete().eq('draft_id', row.id);
  }
  await contentDrafts()
    .delete()
    .eq('created_by_email', email)
    .eq('slug', PART_SLUG)
    .eq('kind', 'journal');
}

async function readMemoryTitle() {
  const { data, error } = await supabaseAdmin
    .from('ao_editorial_memory_items')
    .select('title')
    .eq('created_by_email', TEST_EMAIL.toLowerCase().trim())
    .eq('kind', 'image_series')
    .eq('source_url_or_slug', PART_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.title || null;
}

async function main() {
  await cleanup();

  // Test 1: postTitle wins
  {
    const stored = await storeImageSeriesMemory({
      email: TEST_EMAIL,
      seriesSlug: SERIES,
      partSlug: PART_SLUG,
      partNumber: 3,
      postTitle: 'The Standard That Held',
      imageUrl: IMAGE_URL,
      prompt: 'editorial header prompt',
      style: 'journal_header',
    });
    assert.strictEqual(stored.ok, true, stored.error);
    assert.strictEqual(stored.title, 'The Standard That Held');
    const title = await readMemoryTitle();
    assert.strictEqual(title, 'The Standard That Held');
    assert.ok(!String(title).includes(`${SERIES} — Part`), 'must not synthesize franchise label');
  }

  // Test 2: without postTitle, fall back to partSlug (not series — Part N)
  {
    await supabaseAdmin
      .from('ao_editorial_memory_items')
      .delete()
      .eq('created_by_email', TEST_EMAIL.toLowerCase().trim())
      .eq('kind', 'image_series')
      .eq('source_url_or_slug', PART_SLUG);

    const stored = await storeImageSeriesMemory({
      email: TEST_EMAIL,
      seriesSlug: SERIES,
      partSlug: PART_SLUG,
      partNumber: 3,
      imageUrl: IMAGE_URL,
      prompt: 'prompt only',
    });
    assert.strictEqual(stored.ok, true, stored.error);
    assert.strictEqual(stored.title, PART_SLUG);
    const title = await readMemoryTitle();
    assert.strictEqual(title, PART_SLUG);
    assert.ok(!String(title).includes('— Part'), 'must never synthesize series — Part N');
  }

  // Test 3: saveDraft title correction refreshes memory title
  {
    await storeImageSeriesMemory({
      email: TEST_EMAIL,
      seriesSlug: SERIES,
      partSlug: PART_SLUG,
      partNumber: 3,
      postTitle: 'Scoreboard Leadership, Part 3: The Standard That Held',
      imageUrl: IMAGE_URL,
      prompt: 'stale franchise title',
    });

    const first = await saveDraft({
      email: TEST_EMAIL,
      kind: 'journal',
      slug: PART_SLUG,
      title: 'Scoreboard Leadership, Part 3: The Standard That Held',
      content: 'Initial body for series title selftest.',
      status: 'draft',
      series_slug: SERIES,
      part_number: 3,
      confirmed_new: true,
    });
    assert.strictEqual(first.ok, true, first.error);

    const corrected = await saveDraft({
      email: TEST_EMAIL,
      kind: 'journal',
      slug: PART_SLUG,
      title: 'The Standard That Held',
      content: 'Initial body for series title selftest. Updated.',
      status: 'draft',
      series_slug: SERIES,
      part_number: 3,
    });
    assert.strictEqual(corrected.ok, true, corrected.error);
    assert.strictEqual(corrected.title_changed, true);

    const title = await readMemoryTitle();
    assert.strictEqual(
      title,
      'The Standard That Held',
      `memory title should refresh on saveDraft title change, got: ${title}`
    );

    // Direct refresh helper still works
    const refreshed = await refreshImageSeriesMemoryTitle({
      email: TEST_EMAIL,
      partSlug: PART_SLUG,
      postTitle: 'The Standard That Held',
    });
    assert.strictEqual(refreshed.ok, true, refreshed.error);
    assert.ok(refreshed.updated >= 1);
  }

  await cleanup();
  console.log('editorialMemory.seriesTitle.selftest: PASS');
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanup();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
