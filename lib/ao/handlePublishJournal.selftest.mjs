/**
 * Regression: publish_journal refuses non-approved drafts and runs real publish
 * for approved drafts (no requires_ui_confirmation).
 *
 * Run: node lib/ao/handlePublishJournal.selftest.mjs
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
    // optional
  }
}

loadEnvLocal();

const {
  __setPublishJournalEntryTestOverride,
} = await import('./publishJournalEntry.js');
const { handlePublishJournal } = await import('./autoToolHandlers.js');
const { contentDrafts } = await import('../db/contentDrafts.js');

const TEST_EMAIL = (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase().trim();
const TEST_SLUG = `publish-journal-selftest-${Date.now()}`;

async function cleanup() {
  await contentDrafts()
    .delete()
    .eq('created_by_email', TEST_EMAIL)
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
}

async function insertDraft(status) {
  const { data, error } = await contentDrafts()
    .insert({
      created_by_email: TEST_EMAIL,
      kind: 'journal',
      slug: TEST_SLUG,
      title: 'Publish journal selftest',
      content: '# Selftest\n\nBody for publish gate test.',
      summary: 'Selftest summary.',
      image_url: 'https://example.com/header.jpg',
      status,
      series_slug: 'selftest-series',
      part_number: 1,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select('id, slug, status')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SKIP: Supabase env not set');
    process.exit(0);
  }

  await cleanup();
  const publishCalls = [];

  __setPublishJournalEntryTestOverride(async (params) => {
    publishCalls.push(params);
    return {
      ok: true,
      httpStatus: 200,
      slug: params.slug,
      journal_url: `https://www.archetypeoriginal.com/journal/${params.slug}`,
      commit_sha: 'selftest-mock-sha',
      message: 'mocked publish',
    };
  });

  try {
    await insertDraft('draft');
    const refused = await handlePublishJournal({ slug: TEST_SLUG }, { email: TEST_EMAIL });
    assert.strictEqual(refused.ok, false, 'draft status must be refused');
    assert.match(String(refused.error || ''), /approved/i, 'refusal must mention approve');
    assert.strictEqual(refused.requires_ui_confirmation, undefined);
    assert.strictEqual(publishCalls.length, 0, 'must not call publish for unapproved draft');
    await cleanup();

    await insertDraft('approved');
    const published = await handlePublishJournal({ slug: TEST_SLUG }, { email: TEST_EMAIL });
    assert.strictEqual(published.ok, true, 'approved draft must publish');
    assert.strictEqual(published.requires_ui_confirmation, undefined);
    assert.strictEqual(publishCalls.length, 1, 'must call publishJournalEntry once');
    assert.strictEqual(publishCalls[0].slug, TEST_SLUG);
    assert.ok(published.journal_url?.includes(TEST_SLUG));
    assert.ok(!String(published.message || '').includes('Ready-to-publish'));

    console.log('handlePublishJournal.selftest: PASS');
  } finally {
    __setPublishJournalEntryTestOverride(null);
    await cleanup();
  }
}

main().catch(async (err) => {
  console.error('FAIL:', err);
  __setPublishJournalEntryTestOverride(null);
  try {
    await cleanup();
  } catch (_) {}
  process.exit(1);
});
