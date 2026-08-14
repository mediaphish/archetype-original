/**
 * Regression selftest: save_draft must update the same row id when series_slug /
 * part_number are omitted or wrong — slug+kind is identity.
 *
 * Requires Supabase env (same as production admin). Run:
 *   node lib/ao/autoToolHandlers.draftIdentity.selftest.mjs
 *
 * Cleans up the temporary test row afterward.
 */
import { handleSaveDraft } from './autoToolHandlers.js';
import { canonicalizeSlug, contentDrafts } from '../db/contentDrafts.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const TEST_EMAIL = process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com';
const TEST_SLUG = canonicalizeSlug(`draft-identity-selftest-${Date.now()}`);
const TEST_SERIES = canonicalizeSlug(`draft-identity-series-${Date.now()}`);
const OTHER_SERIES = canonicalizeSlug(`other-series-${Date.now()}`);

async function cleanup() {
  await contentDrafts()
    .delete()
    .eq('created_by_email', TEST_EMAIL.toLowerCase().trim())
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
}

async function main() {
  await cleanup();

  const first = await handleSaveDraft(
    {
      kind: 'journal',
      slug: TEST_SLUG,
      title: 'Draft identity selftest',
      content: 'First save body — correct series metadata.',
      status: 'draft',
      series_slug: TEST_SERIES,
      part_number: 2,
    },
    { email: TEST_EMAIL }
  );
  assert(first.ok, `first save failed: ${first.error}`);
  assert(first.id, 'first save must return row id');
  assert(first.series_slug === TEST_SERIES, 'series_slug stored');
  assert(Number(first.part_number) === 2, 'part_number stored');

  const second = await handleSaveDraft(
    {
      kind: 'journal',
      slug: TEST_SLUG,
      title: 'Draft identity selftest',
      content: 'Second save — series_slug/part_number omitted on purpose.',
      status: 'draft',
      // intentionally omit series_slug + part_number
    },
    { email: TEST_EMAIL }
  );
  assert(second.ok, `second save failed: ${second.error}`);
  assert(second.id === first.id, `omitted series must hit same id (got ${second.id} vs ${first.id})`);
  assert(
    second.series_slug === TEST_SERIES,
    `omitted series must reuse stored series (got ${second.series_slug})`
  );
  assert(Number(second.part_number) === 2, `omitted part must reuse stored part (got ${second.part_number})`);

  const third = await handleSaveDraft(
    {
      kind: 'journal',
      slug: TEST_SLUG,
      title: 'Draft identity selftest',
      content: 'Third save — wrong series_slug would have forked under the old key.',
      status: 'draft',
      series_slug: OTHER_SERIES,
      part_number: 2,
    },
    { email: TEST_EMAIL }
  );
  assert(third.ok, `third save failed: ${third.error}`);
  assert(third.id === first.id, `wrong series_slug must still update same id (got ${third.id})`);

  const { count, error } = await contentDrafts()
    .select('id', { count: 'exact', head: true })
    .eq('created_by_email', TEST_EMAIL.toLowerCase().trim())
    .eq('slug', TEST_SLUG)
    .eq('kind', 'journal');
  assert(!error, `count query failed: ${error?.message}`);
  assert(count === 1, `expected exactly 1 row for test slug, got ${count}`);

  await cleanup();
  console.log('autoToolHandlers.draftIdentity.selftest: all checks passed');
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
