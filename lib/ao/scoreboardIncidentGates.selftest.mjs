/**
 * Regression: Scoreboard Part 3 incident — fabricated completion, save_draft fork,
 * and mandatory prior-parts research for present_outline.
 *
 * Run: node lib/ao/scoreboardIncidentGates.selftest.mjs
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

const {
  findFabricatedCompletions,
  annotateFabricatedCompletions,
} = await import('./gateFabricatedCompletion.js');
const { evaluatePriorPartsOutlineGate } = await import('./priorSeriesParts.js');

// --- Bug 1: fabricated completion ---
{
  const reply =
    'I rebuilt the draft with verified details: a carbon monoxide leak, an executive fired for covering it up, and a Doug Parker corroboration.';
  const fired = findFabricatedCompletions(reply, {
    toolResults: [
      {
        name: 'save_draft',
        result: {
          ok: true,
          slug: 'the-standard-that-held',
          had_prior_version: true,
          content_unchanged: true,
        },
      },
    ],
  });
  assert.strictEqual(fired.fabrications.length, 1, 'unchanged save + claim must fire');
  const annotated = annotateFabricatedCompletions(reply, {
    toolResults: [
      {
        name: 'save_draft',
        result: {
          ok: true,
          had_prior_version: true,
          content_unchanged: true,
        },
      },
    ],
  });
  assert.ok(annotated.appendedNote, 'must append visible warning');

  const realChange = findFabricatedCompletions(reply, {
    toolResults: [
      {
        name: 'save_draft',
        result: {
          ok: true,
          had_prior_version: true,
          content_unchanged: false,
        },
      },
    ],
  });
  assert.strictEqual(realChange.fabrications.length, 0, 'real content change must not fire');

  const noClaim = findFabricatedCompletions('Saved the draft as-is for your review.', {
    toolResults: [
      {
        name: 'save_draft',
        result: { ok: true, had_prior_version: true, content_unchanged: true },
      },
    ],
  });
  assert.strictEqual(noClaim.fabrications.length, 0, 'no fabrication language → no fire');
}

// --- Bug 3 pure gate ---
{
  const refuse = evaluatePriorPartsOutlineGate({
    partNumber: 3,
    priorPartsResult: null,
  });
  assert.strictEqual(refuse.allowed, false);

  const refuse2 = evaluatePriorPartsOutlineGate({
    partNumber: 3,
    priorPartsResult: {
      ok: false,
      error: 'Cannot lock an outline without prior parts',
      missing_part: 2,
    },
  });
  assert.strictEqual(refuse2.allowed, false);

  const ok = evaluatePriorPartsOutlineGate({
    partNumber: 3,
    priorPartsResult: { ok: true, parts: [{ part_number: 2 }], summary: 'Prior series depth' },
  });
  assert.strictEqual(ok.allowed, true);

  const part1 = evaluatePriorPartsOutlineGate({
    partNumber: 1,
    priorPartsResult: null,
  });
  assert.strictEqual(part1.allowed, true, 'part 1 needs no prior parts');
}

const TEST_EMAIL = (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com')
  .toLowerCase()
  .trim();
const SERIES = `scoreboard-incident-${Date.now()}`;
const TRACKED_SLUG = `${SERIES}-part-3-tracked`;
const FORK_SLUG = `${SERIES}-part-3-the-player-s-coach`;
const PART1_SLUG = `${SERIES}-part-1`;

async function dbCases() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('scoreboardIncidentGates.selftest: PASS (pure gates; no DB)');
    return;
  }

  const { handleSaveDraft, handlePresentOutline } = await import('./autoToolHandlers.js');
  const { contentDrafts } = await import('../db/contentDrafts.js');

  async function cleanup() {
    await contentDrafts()
      .delete()
      .eq('created_by_email', TEST_EMAIL)
      .like('slug', `${SERIES}%`);
  }

  await cleanup();

  try {
    // Seed tracked part 3 row (outline-era stub content) with outline already approved
    const first = await handleSaveDraft(
      {
        kind: 'journal',
        slug: TRACKED_SLUG,
        title: 'Tracked Part 3',
        content: 'Original 950-word-ish stub body for the tracked row.',
        status: 'draft',
        series_slug: SERIES,
        part_number: 3,
        metadata: {
          brief: { outline_approved_at: new Date().toISOString() },
        },
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(first.ok, true, first.error);
    const trackedId = first.id;

    // Bug 2: paraphrased slug for same series+part must update tracked row, not fork
    const rebuilt = 'x'.repeat(900) + '\n\nRebuilt body with real research.';
    const second = await handleSaveDraft(
      {
        kind: 'journal',
        slug: FORK_SLUG,
        title: 'The Player Coach',
        content: rebuilt,
        status: 'draft',
        series_slug: SERIES,
        part_number: 3,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(second.ok, true, second.error);
    assert.strictEqual(second.id, trackedId, 'must update tracked id, not fork');
    assert.strictEqual(second.slug, TRACKED_SLUG, 'must keep tracked slug');
    assert.ok(second.redirected_from_slug === FORK_SLUG, 'should record redirect');

    const { data: forkRows } = await contentDrafts()
      .select('id')
      .eq('created_by_email', TEST_EMAIL)
      .eq('slug', FORK_SLUG);
    assert.ok(!forkRows?.length, 'fork slug must not exist as a separate row');

    // Bug 1 evidence fields on unchanged re-save
    const unchanged = await handleSaveDraft(
      {
        kind: 'journal',
        slug: TRACKED_SLUG,
        title: 'Tracked Part 3',
        content: rebuilt,
        status: 'draft',
        series_slug: SERIES,
        part_number: 3,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(unchanged.content_unchanged, true);
    assert.strictEqual(unchanged.had_prior_version, true);

    // Bug 3: present_outline part 3 without prior parts → refuse
    const refusedOutline = await handlePresentOutline(
      {
        slug: `${SERIES}-part-3-outline-only`,
        title: 'Outline without priors',
        outline: '1) Hook\n2) Story\n3) Close',
        series_slug: SERIES,
        part_number: 3,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(refusedOutline.ok, false, 'outline without prior parts must refuse');
    assert.strictEqual(refusedOutline.gate, 'prior_parts_required');

    // Seed part 1 with real depth, then outline should succeed
    const part1Body = `${'word '.repeat(400)}\n\n# Section One\n\nBody.`;
    const p1 = await handleSaveDraft(
      {
        kind: 'journal',
        slug: PART1_SLUG,
        title: 'Part 1',
        content: part1Body,
        status: 'draft',
        series_slug: SERIES,
        part_number: 1,
        skip_outline: true,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(p1.ok, true, p1.error);

    // Still need part 2 as immediate prior for part 3
    const part2Body = `${'word '.repeat(350)}\n\n# Section A\n\nMore.`;
    const p2 = await handleSaveDraft(
      {
        kind: 'journal',
        slug: `${SERIES}-part-2`,
        title: 'Part 2',
        content: part2Body,
        status: 'draft',
        series_slug: SERIES,
        part_number: 2,
        skip_outline: true,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(p2.ok, true, p2.error);

    const outlined = await handlePresentOutline(
      {
        slug: TRACKED_SLUG,
        title: 'Tracked Part 3',
        outline: '1) Hook\n2) Story\n3) Close',
        series_slug: SERIES,
        part_number: 3,
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(outlined.ok, true, outlined.error);
    assert.match(String(outlined.prior_parts_summary || ''), /Prior series depth/i);
    assert.match(String(outlined.prior_parts_summary || ''), /words/i);
    assert.ok((outlined.prior_parts || []).length >= 1);

    console.log('scoreboardIncidentGates.selftest: PASS');
  } finally {
    await cleanup();
  }
}

await dbCases();
