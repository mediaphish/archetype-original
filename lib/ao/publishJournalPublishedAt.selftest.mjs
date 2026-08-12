/**
 * Regression: marking a draft published must set published_at (not null).
 *
 * Covers the shared markPublished helper and the same field the live
 * publishJournalEntry updates write on success.
 *
 * Run: node lib/ao/publishJournalPublishedAt.selftest.mjs
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

const { contentDrafts, markPublished } = await import('../db/contentDrafts.js');

const TEST_EMAIL = (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com')
  .toLowerCase()
  .trim();
const TEST_SLUG = `published-at-selftest-${Date.now()}`;

async function cleanup() {
  await contentDrafts()
    .delete()
    .eq('created_by_email', TEST_EMAIL)
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('publishJournalPublishedAt.selftest: SKIP (no DB env)');
    return;
  }

  await cleanup();

  try {
    const { data: inserted, error: insertErr } = await contentDrafts()
      .insert({
        created_by_email: TEST_EMAIL,
        kind: 'journal',
        slug: TEST_SLUG,
        title: 'published_at selftest',
        content: 'Body',
        summary: 'Summary',
        status: 'approved',
        series_slug: 'published-at-selftest',
        part_number: 1,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('id, status, published_at')
      .single();
    if (insertErr) throw new Error(insertErr.message);
    assert.strictEqual(inserted.published_at, null, 'precondition: published_at starts null');

    // Same fields publishJournalEntry writes on the successful draft-status update.
    const before = Date.now();
    const marked = await markPublished({
      id: inserted.id,
      selectAfter: 'id, slug, status, published_at',
    });
    const after = Date.now();
    assert.strictEqual(marked.ok, true, marked.error || 'markPublished failed');
    assert.strictEqual(marked.row.status, 'published');
    assert.ok(marked.row.published_at, 'published_at must be set');
    const ts = new Date(marked.row.published_at).getTime();
    assert.ok(!Number.isNaN(ts), 'published_at must parse as a real timestamp');
    assert.ok(ts >= before - 1000 && ts <= after + 1000, 'published_at should be ~now');

    // Mirror the exact primary update shape used in publishJournalEntry.js
    await contentDrafts()
      .update({ status: 'approved', published_at: null, updated_at: new Date().toISOString() })
      .eq('id', inserted.id);

    const nowIso = new Date().toISOString();
    const { data: directRows, error: directErr } = await contentDrafts()
      .update({
        status: 'published',
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', inserted.id)
      .select('id, status, published_at')
      .limit(1);
    assert.ok(!directErr, directErr?.message);
    assert.strictEqual(directRows[0].status, 'published');
    assert.ok(directRows[0].published_at, 'direct publishJournalEntry-shaped update sets published_at');

    console.log('publishJournalPublishedAt.selftest: PASS');
  } finally {
    await cleanup();
  }
}

main().catch(async (err) => {
  console.error('FAIL:', err);
  try {
    await cleanup();
  } catch (_) {}
  process.exit(1);
});
