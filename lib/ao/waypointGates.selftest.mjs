/**
 * Phase 3 waypoint gates: outline-before-full-draft + captions-before-publish.
 * Run: node lib/ao/waypointGates.selftest.mjs
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
  evaluateOutlineSaveGate,
  evaluatePublishCaptionsGate,
  classifyOutlineReply,
  buildCompleteCaptionsBlockForTest,
  FULL_DRAFT_CONTENT_THRESHOLD,
} = await import('./waypointGates.js');

const longBody = `${'x'.repeat(FULL_DRAFT_CONTENT_THRESHOLD + 40)}\n\n# Nehemiah selftest full draft`;

// Pure outline gate — Nehemiah incident reproduction
{
  const refused = evaluateOutlineSaveGate({
    kind: 'journal',
    content: longBody,
    existing: null,
  });
  assert.strictEqual(refused.allowed, false, 'brand-new long draft must refuse');
  assert.match(String(refused.error || ''), /outline/i);

  const approved = evaluateOutlineSaveGate({
    kind: 'journal',
    content: longBody,
    existing: {
      content: 'short outline stub',
      metadata: { brief: { outline_approved_at: '2026-08-12T00:00:00.000Z' } },
    },
  });
  assert.strictEqual(approved.allowed, true, 'approved outline must allow full save');

  const shortOk = evaluateOutlineSaveGate({
    kind: 'journal',
    content: 'short plan only',
    existing: null,
  });
  assert.strictEqual(shortOk.allowed, true, 'short content not gated');
}

// Caption gate
{
  const missing = evaluatePublishCaptionsGate({ content: '# Post\n\nNo captions.' });
  assert.strictEqual(missing.ok, false);
  assert.ok(missing.missing.length >= 4);
  assert.match(String(missing.error || ''), /missing:/i);

  const completeBody = `# Post\n\nBody.\n\n${buildCompleteCaptionsBlockForTest()}`;
  const ok = evaluatePublishCaptionsGate({ content: completeBody });
  assert.strictEqual(ok.ok, true, 'all channels present → publish captions gate ok');
}

assert.strictEqual(classifyOutlineReply('yes'), 'approve');
assert.strictEqual(classifyOutlineReply('skip the outline, just write it'), 'skip');
assert.strictEqual(classifyOutlineReply('can you tweak the third bullet?'), 'neither');

const { handleSaveDraft, handlePublishJournal, handlePresentOutline } = await import(
  './autoToolHandlers.js'
);
const { __setPublishJournalEntryTestOverride } = await import('./publishJournalEntry.js');
const { contentDrafts } = await import('../db/contentDrafts.js');

const TEST_EMAIL = (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com')
  .toLowerCase()
  .trim();
const OUTLINE_SLUG = `waypoint-outline-${Date.now()}`;
const PUBLISH_SLUG = `waypoint-publish-${Date.now()}`;

async function cleanup(slug) {
  await contentDrafts()
    .delete()
    .eq('created_by_email', TEST_EMAIL)
    .eq('slug', slug)
    .eq('kind', 'journal');
}

async function dbCases() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('waypointGates.selftest: PASS (pure gates; no DB)');
    return;
  }

  await cleanup(OUTLINE_SLUG);
  await cleanup(PUBLISH_SLUG);

  try {
    // 1) Long save_draft with no prior row → refuse
    const refused = await handleSaveDraft(
      {
        kind: 'journal',
        slug: OUTLINE_SLUG,
        title: 'Waypoint outline selftest',
        content: longBody,
        status: 'draft',
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(refused.ok, false, 'Nehemiah-style cold full save must refuse');
    assert.strictEqual(refused.gate, 'outline_required');
    assert.match(String(refused.error || ''), /outline/i);

    // 2) present_outline + approve metadata + full save → succeed
    const outlined = await handlePresentOutline(
      {
        slug: OUTLINE_SLUG,
        title: 'Waypoint outline selftest',
        outline: '1) Hook\n2) Problem\n3) Nehemiah parallel\n4) Close',
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(outlined.ok, true, 'present_outline must succeed');

    const { error: metaErr } = await contentDrafts()
      .update({
        metadata: {
          brief: {
            outline_text: '1) Hook\n2) Problem\n3) Nehemiah parallel\n4) Close',
            outline_presented_at: new Date().toISOString(),
            outline_approved_at: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('created_by_email', TEST_EMAIL)
      .eq('slug', OUTLINE_SLUG)
      .eq('kind', 'journal');
    assert.ok(!metaErr, metaErr?.message);

    const saved = await handleSaveDraft(
      {
        kind: 'journal',
        slug: OUTLINE_SLUG,
        title: 'Waypoint outline selftest',
        content: longBody,
        status: 'draft',
      },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(saved.ok, true, 'full save after outline approval must succeed');

    // 3) publish without captions → refuse
    const publishCalls = [];
    __setPublishJournalEntryTestOverride(async (params) => {
      publishCalls.push(params);
      return {
        ok: true,
        httpStatus: 200,
        slug: params.slug,
        journal_url: `https://www.archetypeoriginal.com/journal/${params.slug}`,
        commit_sha: 'selftest',
        message: 'mocked',
      };
    });

    await contentDrafts().insert({
      created_by_email: TEST_EMAIL,
      kind: 'journal',
      slug: PUBLISH_SLUG,
      title: 'Waypoint publish selftest',
      content: '# Selftest\n\nBody without captions.',
      summary: 'summary',
      image_url: 'https://example.com/header.jpg',
      status: 'approved',
      series_slug: 'waypoint-publish-selftest',
      part_number: 1,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const noCaptions = await handlePublishJournal(
      { slug: PUBLISH_SLUG },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(noCaptions.ok, false, 'publish without captions must refuse');
    assert.strictEqual(
      noCaptions.gate,
      'captions_required',
      `expected captions gate, got: ${noCaptions.error || JSON.stringify(noCaptions)}`
    );
    assert.match(String(noCaptions.error || ''), /missing:/i);
    assert.strictEqual(publishCalls.length, 0);

    // 4) same draft with all channels → proceeds to publish logic
    await contentDrafts()
      .update({
        content: `# Selftest\n\nBody.\n\n${buildCompleteCaptionsBlockForTest()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('created_by_email', TEST_EMAIL)
      .eq('slug', PUBLISH_SLUG)
      .eq('kind', 'journal');

    const withCaptions = await handlePublishJournal(
      { slug: PUBLISH_SLUG },
      { email: TEST_EMAIL }
    );
    assert.strictEqual(withCaptions.ok, true, 'complete captions must publish');
    assert.strictEqual(publishCalls.length, 1);

    console.log('waypointGates.selftest: PASS');
  } finally {
    __setPublishJournalEntryTestOverride(null);
    await cleanup(OUTLINE_SLUG);
    await cleanup(PUBLISH_SLUG);
  }
}

await dbCases();
