/**
 * Regression: cross-thread stated preferences (Phase 2).
 * Run: node lib/ao/statedPreferences.selftest.mjs
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
  classifyPreferenceHeuristically,
  maybeCaptureStatedPreferenceFromMessage,
  listActiveStatedPreferences,
  supersedeStatedPreference,
  formatStatedPreferencesForPrompt,
  loadStatedPreferencesContext,
} = await import('./statedPreferences.js');
const { buildSystemPrompt } = await import('./autoV2.js');

// Heuristic: durable preference stores
{
  const d = classifyPreferenceHeuristically(
    'always sign off with my full name, not initials'
  );
  assert.strictEqual(d.store, true, 'durable naming preference should store');
  assert.ok(d.fact, 'fact required');
  assert.strictEqual(d.category, 'voice');
}

// Heuristic: one-off request does NOT store
{
  const d = classifyPreferenceHeuristically('can you make this post shorter');
  assert.strictEqual(d.store, false, 'one-off shorten request must not store');
}

// Prompt formatting + buildSystemPrompt surfaces preferences for a "fresh thread"
{
  const prefs = [
    {
      fact: 'Always use Bart Paden full name in bylines, not initials',
      category: 'voice',
      superseded_by: null,
    },
  ];
  const block = formatStatedPreferencesForPrompt(prefs);
  assert.match(block, /STANDING PREFERENCES/i);
  assert.match(block, /Bart Paden full name/i);

  const prompt = buildSystemPrompt('', '', '', '', '', '', '', block);
  assert.match(prompt, /STANDING PREFERENCES/i);
  assert.match(prompt, /Bart Paden full name/i);

  const supersededBlock = formatStatedPreferencesForPrompt([
    { ...prefs[0], superseded_by: 'forgotten' },
  ]);
  assert.strictEqual(supersededBlock, '', 'superseded prefs must not appear in prompt');
}

async function dbRoundTrip() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('statedPreferences.selftest: PASS (heuristic+prompt; no DB)');
    return;
  }

  const email =
    (process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase().trim();
  const uniqueFact = `selftest always use full name in bylines (${Date.now()})`;

  const captured = await maybeCaptureStatedPreferenceFromMessage({
    email,
    userMessage: uniqueFact,
    threadId: 'thread-a-selftest',
    messageId: null,
    classifier: async () => ({
      store: true,
      fact: uniqueFact,
      category: 'voice',
      reason: 'selftest',
    }),
  });
  assert.strictEqual(captured.stored, true, 'capture should store');

  const skipped = await maybeCaptureStatedPreferenceFromMessage({
    email,
    userMessage: 'can you make this post shorter',
    classifier: classifyPreferenceHeuristically,
  });
  assert.strictEqual(skipped.stored, false, 'one-off must not store');

  const ctx = await loadStatedPreferencesContext(email);
  assert.match(ctx, /selftest always use full name/i);

  const listed = await listActiveStatedPreferences(email, { limit: 30 });
  assert.ok(listed.ok);
  assert.ok(listed.preferences.some((p) => p.fact.includes('selftest always use full name')));

  const forgotten = await supersedeStatedPreference({
    email,
    factContains: 'selftest always use full name',
    supersededBy: 'selftest_cleanup',
  });
  assert.strictEqual(forgotten.ok, true);

  const ctxAfter = await loadStatedPreferencesContext(email);
  assert.ok(
    !ctxAfter.includes('selftest always use full name'),
    'superseded preference must leave future context'
  );

  console.log('statedPreferences.selftest: PASS');
}

await dbRoundTrip();
