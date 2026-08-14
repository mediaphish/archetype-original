/**
 * Batch selftests for #121/#126/#125/#122/#123 work.
 * Run: node lib/ao/batchFixes.selftest.mjs
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

const { findUnbackedActionClaims } = await import('./gateActionClaims.js');
const {
  evaluateCaptionQualityGate,
  CAPTION_MIN_LENGTH_BY_CHANNEL,
} = await import('./waypointGates.js');
const {
  JOURNAL_LAUNCH_REQUIRED_CHANNELS,
  extractJournalSocialCaptionTexts,
  extractAllCaptionTextsByPlatform,
} = await import('./parseJournalSocialCaptions.js');
const {
  setCaptionEngagementCheckOverrideForTests,
  evaluateCaptionEngagementQuality,
  getCachedPlatformEngagementGuidance,
  clearCaptionEngagementGuidanceCacheForTests,
  setCaptionEngagementGuidanceFetcherForTests,
} = await import('./captionEngagementQuality.js');
const {
  getThinSampleThreshold,
  setPlatformTimingGuidanceFetcherForTests,
  clearPlatformTimingGuidanceCacheForTests,
  getPlatformTimingExternalGuidance,
} = await import('./platformTimingGuidance.js');

// --- #126 question-form offers ---
{
  const warn = console.warn;
  const logs = [];
  console.warn = (...args) => {
    logs.push(args);
    return warn(...args);
  };
  try {
    assert.strictEqual(
      findUnbackedActionClaims('Want me to schedule the captions now?', { toolResults: [] })
        .unbacked.length,
      0,
      'want me to schedule must not fire'
    );
    assert.strictEqual(
      findUnbackedActionClaims('Ready to publish this?', { toolResults: [] }).unbacked.length,
      0,
      'ready to publish must not fire'
    );
    assert.ok(
      findUnbackedActionClaims("I've published the post.", { toolResults: [] }).unbacked.some(
        (u) => u.ruleId === 'publish'
      ),
      'real published claim must still fire'
    );
    assert.strictEqual(
      findUnbackedActionClaims(
        'Want me to lock these times in for that day and schedule the captions now?',
        { toolResults: [] }
      ).unbacked.length,
      0
    );
    assert.strictEqual(
      findUnbackedActionClaims(
        'Want me to go ahead and lock next Wednesday at those times and schedule the captions?',
        { toolResults: [] }
      ).unbacked.length,
      0
    );
    assert.ok(
      logs.some((a) => a[0] === '[gateActionClaims] fired'),
      'diagnostic logging must fire on real unbacked claim'
    );

    const falseNeg = findUnbackedActionClaims(
      'Confirmed and saved for real: all 7 caption channels are locked in as approved. Schedule times, grounded in your real engagement history: LinkedIn 10:30am CT.',
      { toolResults: [] }
    );
    assert.ok(
      falseNeg.unbacked.some((u) => u.ruleId === 'save_or_rebuild'),
      'confident saved-for-real claim must fire save_or_rebuild'
    );
    assert.ok(
      falseNeg.unbacked.some((u) => u.ruleId === 'schedule'),
      'Schedule times grounded-in claim must fire schedule'
    );
  } finally {
    console.warn = warn;
  }
}

// --- #125 instagram_personal in required channels ---
{
  assert.ok(
    JOURNAL_LAUNCH_REQUIRED_CHANNELS.some(
      (c) => c.key === 'instagram_personal' && c.account_id === 'ig_mediaphish'
    ),
    'instagram_personal must be required with ig_mediaphish'
  );
  assert.ok(
    JOURNAL_LAUNCH_REQUIRED_CHANNELS.some(
      (c) => c.key === 'instagram_business' && c.account_id === 'meta'
    ),
    'instagram_business must stay on meta account'
  );

  const block = `[SOCIAL_CAPTIONS]
[CAPTION platform="linkedin_personal"]LP[/CAPTION]
[CAPTION platform="instagram_business"]IB[/CAPTION]
[CAPTION platform="instagram_personal"]IP personal caption with Link in bio.[/CAPTION]
[CAPTION platform="facebook_business"]FB[/CAPTION]
[CAPTION platform="twitter"]X caption near two hundred chars ${'x'.repeat(160)}[/CAPTION]
[CAPTION platform="linkedin_business"]LB manual[/CAPTION]
[CAPTION platform="facebook_personal"]FP manual[/CAPTION]
[/SOCIAL_CAPTIONS]`;
  const extracted = extractJournalSocialCaptionTexts(block);
  assert.ok(extracted.found.instagram_personal, 'extract must find instagram_personal');
  assert.strictEqual(extracted.missingChannels.length, 0);
  const all = extractAllCaptionTextsByPlatform(block);
  assert.ok(all.linkedin_business && all.facebook_personal);
}

// --- #125 Settings status shape + personal account id isolation ---
{
  const { formatInstagramLoginStatus, IG_PERSONAL_ACCOUNT_ID } = await import(
    './instagramLoginStatus.js'
  );
  assert.strictEqual(IG_PERSONAL_ACCOUNT_ID, 'ig_mediaphish');

  const missing = formatInstagramLoginStatus(null);
  assert.strictEqual(missing.connected, false);
  assert.strictEqual(missing.state, 'not_connected');

  const now = Date.parse('2026-08-14T12:00:00.000Z');
  const healthy = formatInstagramLoginStatus(
    {
      token: 'x',
      igUserId: '17841400689520030',
      username: 'mediaphish',
      expiresAt: '2026-09-24T00:00:00.000Z',
    },
    { nowMs: now }
  );
  assert.strictEqual(healthy.connected, true);
  assert.strictEqual(healthy.username, 'mediaphish');
  assert.strictEqual(healthy.instagram_user_id, '17841400689520030');
  assert.ok(!healthy.expiry_warning);

  const soon = formatInstagramLoginStatus(
    {
      token: 'x',
      igUserId: '17841400689520030',
      username: 'mediaphish',
      expiresAt: '2026-08-20T00:00:00.000Z',
    },
    { nowMs: now }
  );
  assert.ok(soon.expiry_warning);
  assert.match(soon.expiry_warning, /expires in \d+ days?/i);

  const personalHandler = fs.readFileSync(
    path.join(__dirname, '../../api/providers/meta/test-post-personal.js'),
    'utf8'
  );
  assert.ok(
    personalHandler.includes("IG_PERSONAL_ACCOUNT_ID") &&
      personalHandler.includes('postToInstagram'),
    'personal test-post must call postToInstagram with ig_mediaphish'
  );
  assert.ok(
    !personalHandler.includes("'meta'") || personalHandler.includes('ig_mediaphish'),
    'personal test-post must not default to Page-linked meta account'
  );

  const businessHandler = fs.readFileSync(
    path.join(__dirname, '../../api/providers/meta/test-post.js'),
    'utf8'
  );
  assert.ok(
    businessHandler.includes("postToInstagram") && businessHandler.includes("'meta'"),
    'business Instagram test-post must stay on meta account_id'
  );
}

// --- #122 caption quality heuristics ---
{
  const thin = evaluateCaptionQualityGate({
    linkedin_personal: 'Too short.',
  });
  assert.strictEqual(thin.ok, false);
  assert.ok(thin.failures[0].reasons.some((r) => /too thin/i.test(r)));

  const longNoCta = 'A'.repeat(CAPTION_MIN_LENGTH_BY_CHANNEL.linkedin_personal + 20);
  const noCta = evaluateCaptionQualityGate({ linkedin_personal: longNoCta });
  assert.strictEqual(noCta.ok, false);
  assert.ok(noCta.failures[0].reasons.some((r) => /call to action/i.test(r)));

  const solid =
    `${'This post argues that standards hold when leaders stay present. '.repeat(8)}` +
    `What would change if you held the line this week? Tell me in the comments.`;
  const pass = evaluateCaptionQualityGate({ linkedin_personal: solid });
  assert.strictEqual(pass.ok, true, pass.error);
}

// --- #122 LLM gate wiring (mocked) ---
{
  setCaptionEngagementCheckOverrideForTests(async () => ({
    ok: false,
    failures: [{ channel: 'linkedin_personal', reason: 'generic hook' }],
    error: 'Caption engagement check failed — rewrite before scheduling. linkedin_personal: generic hook',
  }));
  const mocked = await evaluateCaptionEngagementQuality({
    linkedin_personal: `${'Solid length content with a question? '.repeat(20)}`,
  });
  assert.strictEqual(mocked.ok, false);
  setCaptionEngagementCheckOverrideForTests(null);

  clearCaptionEngagementGuidanceCacheForTests();
  let fetches = 0;
  setCaptionEngagementGuidanceFetcherForTests(async () => {
    fetches += 1;
    return 'mock linkedin guidance';
  });
  await getCachedPlatformEngagementGuidance('linkedin_personal');
  await getCachedPlatformEngagementGuidance('linkedin_personal');
  assert.strictEqual(fetches, 1, 'guidance cache must reuse within window');
  setCaptionEngagementGuidanceFetcherForTests(null);
  clearCaptionEngagementGuidanceCacheForTests();
}

// --- #123 thin sample supplement (via guidance module + threshold) ---
{
  assert.strictEqual(getThinSampleThreshold(), 30);
  clearPlatformTimingGuidanceCacheForTests();
  let timingFetches = 0;
  setPlatformTimingGuidanceFetcherForTests(async () => {
    timingFetches += 1;
    return 'mock X timing guidance';
  });
  const a = await getPlatformTimingExternalGuidance('twitter');
  const b = await getPlatformTimingExternalGuidance('twitter');
  assert.strictEqual(a, 'mock X timing guidance');
  assert.strictEqual(b, 'mock X timing guidance');
  assert.strictEqual(timingFetches, 1);
  setPlatformTimingGuidanceFetcherForTests(null);
  clearPlatformTimingGuidanceCacheForTests();
}

console.log('batchFixes.selftest: PASS');
