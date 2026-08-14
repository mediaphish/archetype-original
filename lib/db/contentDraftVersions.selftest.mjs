/**
 * Regression: saveDraft writes a version row with pre-overwrite content
 * before replacing ao_content_drafts.content. Two consecutive saves produce
 * two distinct version rows.
 *
 * Requires Supabase env. Run:
 *   node lib/db/contentDraftVersions.selftest.mjs
 */

import { saveDraft, contentDrafts, canonicalizeSlug } from './contentDrafts.js';
import {
  contentDraftVersions,
  countVersions,
  listVersions,
  getVersion,
} from './contentDraftVersions.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const TEST_EMAIL = process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com';
const stamp = Date.now();
const TEST_SLUG = canonicalizeSlug(`draft-version-history-selftest-${stamp}`);
const TEST_SERIES = canonicalizeSlug(`draft-version-series-${stamp}`);

async function cleanup() {
  const email = TEST_EMAIL.toLowerCase().trim();
  const { data: rows } = await contentDrafts()
    .select('id')
    .eq('created_by_email', email)
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
  for (const row of rows || []) {
    await contentDraftVersions().delete().eq('draft_id', row.id);
  }
  await contentDrafts()
    .delete()
    .eq('created_by_email', email)
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
}

async function main() {
  await cleanup();

  const firstBody = 'Version history first body — alpha unique phrase.';
  const first = await saveDraft({
    email: TEST_EMAIL,
    kind: 'journal',
    slug: TEST_SLUG,
    title: 'Version history selftest',
    content: firstBody,
    status: 'draft',
    series_slug: TEST_SERIES,
    part_number: 1,
  });
  assert(first.ok, `first save failed: ${first.error}`);
  assert(first.id, 'first save must return id');
  assert(first.version_saved !== true, 'first save must not write a version row');

  const count0 = await countVersions({ draftId: first.id, email: TEST_EMAIL });
  assert(count0.ok && count0.count === 0, `expected 0 versions after first save, got ${count0.count}`);

  const secondBody = 'Version history second body — beta unique phrase, rewritten.';
  const second = await saveDraft({
    email: TEST_EMAIL,
    kind: 'journal',
    slug: TEST_SLUG,
    title: 'Version history selftest',
    content: secondBody,
    status: 'draft',
    series_slug: TEST_SERIES,
    part_number: 1,
  });
  assert(second.ok, `second save failed: ${second.error}`);
  assert(second.id === first.id, 'second save must update same draft id');
  assert(second.version_saved === true, 'second save must write a version row');
  assert(second.version_id, 'second save must return version_id');

  const v1 = await getVersion({ versionId: second.version_id, email: TEST_EMAIL });
  assert(v1.ok, `getVersion failed: ${v1.error}`);
  assert(
    v1.version.content === firstBody,
    'version row must contain pre-save content, not the new content'
  );
  assert(v1.version.content !== secondBody, 'version must not equal the new body');

  const thirdBody = 'Version history third body — gamma unique phrase.';
  const third = await saveDraft({
    email: TEST_EMAIL,
    kind: 'journal',
    slug: TEST_SLUG,
    title: 'Version history selftest v3',
    content: thirdBody,
    status: 'draft',
  });
  assert(third.ok, `third save failed: ${third.error}`);
  assert(third.version_saved === true, 'third save must write another version row');
  assert(third.version_id !== second.version_id, 'third save must create a distinct version id');

  const count2 = await countVersions({ draftId: first.id, email: TEST_EMAIL });
  assert(count2.ok && count2.count === 2, `expected 2 version rows, got ${count2.count}`);

  const listed = await listVersions({ draftId: first.id, email: TEST_EMAIL });
  assert(listed.ok && listed.versions.length === 2, 'listVersions should return 2');
  assert(listed.versions[0].id === third.version_id, 'newest version should be first in list');

  const v2 = await getVersion({ versionId: third.version_id, email: TEST_EMAIL });
  assert(v2.ok && v2.version.content === secondBody, 'newest version snapshot should be second body');

  await cleanup();
  console.log('contentDraftVersions.selftest: all checks passed');
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
