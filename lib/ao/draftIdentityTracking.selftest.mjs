/**
 * Regression: thread-level draft identity (draft_id) + ambiguous_new_draft backstop.
 *
 * Run: node lib/ao/draftIdentityTracking.selftest.mjs
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

const { handlePresentOutline, handleSaveDraft } = await import('./autoToolHandlers.js');
const { formatApprovedDraftContextLine } = await import('./autoV2.js');
const { contentDrafts, canonicalizeSlug } = await import('../db/contentDrafts.js');
const { contentDraftVersions } = await import('../db/contentDraftVersions.js');

const TEST_EMAIL = process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com';
const stamp = Date.now();
const SERIES = canonicalizeSlug(`draft-id-track-${stamp}`);
const OUTLINE_SLUG = canonicalizeSlug(`${SERIES}-tracked-title`);
const FORK_SLUG = canonicalizeSlug(`${SERIES}-players-coach-alt`);
const LONG_CHAT_SLUG = canonicalizeSlug(
  `you-didn-t-give-me-the-full-draft-this-was-your-last-message-and-it-shows-you-ar-${stamp}`
);
const SHORT_NEW_SLUG = canonicalizeSlug(`three-lessons-from-a-hard-week-${stamp}`);

const longBody = `${'word '.repeat(220)}\n\n# Section\n\nBody with enough length for a full journal save.`;

async function cleanupSlug(slug) {
  const email = TEST_EMAIL.toLowerCase().trim();
  const { data: rows } = await contentDrafts()
    .select('id')
    .eq('created_by_email', email)
    .eq('slug', slug)
    .eq('kind', 'journal');
  for (const row of rows || []) {
    await contentDraftVersions().delete().eq('draft_id', row.id);
  }
  await contentDrafts()
    .delete()
    .eq('created_by_email', email)
    .eq('slug', slug)
    .eq('kind', 'journal');
}

async function cleanup() {
  await cleanupSlug(OUTLINE_SLUG);
  await cleanupSlug(FORK_SLUG);
  await cleanupSlug(LONG_CHAT_SLUG);
  await cleanupSlug(SHORT_NEW_SLUG);
}

async function main() {
  await cleanup();

  // Test 4: approved-drafts context line includes id:
  {
    const line = formatApprovedDraftContextLine({
      id: '11111111-2222-3333-4444-555555555555',
      kind: 'journal',
      title: 'Sample',
      slug: 'sample-slug',
      part_number: 3,
      status: 'approved',
      image_url: null,
      approved_at: '2026-08-14T00:00:00.000Z',
    });
    assert.ok(line.includes('id: 11111111-2222-3333-4444-555555555555'), line);
    assert.ok(line.includes('slug: sample-slug'), line);
  }

  // Test 1: present_outline then save_draft with returned draft_id → one row
  const outline = await handlePresentOutline(
    {
      slug: OUTLINE_SLUG,
      title: 'Tracked Title',
      outline: 'Brief plan with anchors and depth note for part 1.',
      series_slug: SERIES,
      part_number: 1,
    },
    { email: TEST_EMAIL }
  );
  assert.strictEqual(outline.ok, true, outline.error);
  assert.ok(outline.id, 'outline must return id');
  assert.ok(
    String(outline.message || '').includes(`draft_id="${outline.id}"`),
    'outline message must tell model to reuse draft_id'
  );

  const full = await handleSaveDraft(
    {
      kind: 'journal',
      slug: FORK_SLUG,
      title: 'Different paraphrased slug',
      content: longBody,
      status: 'draft',
      series_slug: SERIES,
      part_number: 1,
      draft_id: outline.id,
      skip_outline: true,
    },
    { email: TEST_EMAIL }
  );
  assert.strictEqual(full.ok, true, full.error);
  assert.strictEqual(full.id, outline.id, 'draft_id must update same row');
  assert.ok(String(full.message || '').includes(`draft_id="${full.id}"`));

  const { count, error: countErr } = await contentDrafts()
    .select('id', { count: 'exact', head: true })
    .eq('created_by_email', TEST_EMAIL.toLowerCase().trim())
    .in('slug', [OUTLINE_SLUG, FORK_SLUG])
    .eq('kind', 'journal');
  assert.ok(!countErr, countErr?.message);
  assert.strictEqual(count, 1, `expected exactly 1 row after draft_id reuse, got ${count}`);

  // Test 2: long chat-sentence slug + full content, no identity → ambiguous_new_draft
  const ambiguous = await handleSaveDraft(
    {
      kind: 'journal',
      slug: LONG_CHAT_SLUG,
      title: 'Lost track slug',
      content: longBody,
      status: 'draft',
      skip_outline: true,
    },
    { email: TEST_EMAIL }
  );
  assert.strictEqual(ambiguous.ok, false, 'ambiguous long slug must refuse');
  assert.strictEqual(ambiguous.gate, 'ambiguous_new_draft');

  // Test 3: short topical slug + confirmed_new → inserts
  const fresh = await handleSaveDraft(
    {
      kind: 'journal',
      slug: SHORT_NEW_SLUG,
      title: 'Three Lessons From a Hard Week',
      content: longBody,
      status: 'draft',
      skip_outline: true,
      confirmed_new: true,
    },
    { email: TEST_EMAIL }
  );
  assert.strictEqual(fresh.ok, true, fresh.error);
  assert.ok(fresh.id);

  await cleanup();
  console.log('draftIdentityTracking.selftest: PASS');
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
