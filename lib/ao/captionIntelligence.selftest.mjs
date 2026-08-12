/**
 * Regression: X caption length gate + caption-craft insight lines.
 * Run: node lib/ao/captionIntelligence.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  /* optional for pure validateTwitterCaptionLength tests */
}

const {
  TWITTER_CAPTION_MAX_CHARS,
  validateTwitterCaptionLength,
  parseJournalSocialCaptions,
} = await import('./parseJournalSocialCaptions.js');
const { evaluatePublishCaptionsGate, buildCompleteCaptionsBlockForTest } = await import(
  './waypointGates.js'
);
const {
  buildCaptionCraftInsightLines,
  formatCaptionCraftInsightSection,
} = await import('./captionCraftInsight.js');

assert.strictEqual(TWITTER_CAPTION_MAX_CHARS, 280, 'limit must be the real X standard of 280');

{
  const ok = validateTwitterCaptionLength('Short X caption with a link https://example.com/j');
  assert.strictEqual(ok.ok, true);
  assert.ok(ok.count <= 280);
}

{
  const over = 'x'.repeat(281);
  const bad = validateTwitterCaptionLength(over);
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.count, 281);
  assert.strictEqual(bad.limit, 280);
  assert.match(bad.error, /281/);
  assert.match(bad.error, /280/);
  assert.match(bad.error, /not truncated|Shorten/i);
}

{
  const body =
    `# Post\n\n` +
    buildCompleteCaptionsBlockForTest('ok').replace(
      /\[CAPTION platform="twitter"\][\s\S]*?\[\/CAPTION\]/i,
      `[CAPTION platform="twitter"]\n${'Z'.repeat(300)}\n[/CAPTION]`
    );
  const parsed = await parseJournalSocialCaptions(body, 'x-limit-test', 'https://example.com/j', '');
  assert.strictEqual(parsed.twitterOverLimit, true);
  assert.ok(!parsed.rows.some((r) => r.platform === 'twitter'), 'oversized twitter row must not schedule');

  const gate = evaluatePublishCaptionsGate({ content: body, slug: 'x-limit-test' });
  assert.strictEqual(gate.ok, false);
  assert.match(String(gate.error || ''), /300|280/);
}

{
  const underBody =
    `# Post\n\n` +
    buildCompleteCaptionsBlockForTest('ok').replace(
      /\[CAPTION platform="twitter"\][\s\S]*?\[\/CAPTION\]/i,
      `[CAPTION platform="twitter"]\nUnder the limit.\n[/CAPTION]`
    );
  const parsed = await parseJournalSocialCaptions(underBody, 'x-ok', 'https://example.com/j', '');
  assert.ok(!parsed.twitterOverLimit);
  assert.ok(parsed.rows.some((r) => r.platform === 'twitter'));
  const gate = evaluatePublishCaptionsGate({ content: underBody });
  assert.strictEqual(gate.ok, true);
}

{
  const none = formatCaptionCraftInsightSection([]);
  assert.strictEqual(none, '');

  const thin = buildCaptionCraftInsightLines([
    { platform: 'instagram', caption: 'One #a', engagement_score: 1 },
    { platform: 'instagram', caption: 'Two #b', engagement_score: 2 },
  ]);
  assert.strictEqual(thin.length, 0, 'need at least 3 posts per platform');

  const rich = formatCaptionCraftInsightSection([
    {
      platform: 'instagram',
      caption: 'Top one with #lead #culture #serve more words here for length',
      engagement_score: 40,
      reactions: 5,
      posted_at_utc: '2026-08-01T00:00:00Z',
    },
    {
      platform: 'instagram',
      caption: 'Top two #lead #trust',
      engagement_score: 35,
      reactions: 4,
      posted_at_utc: '2026-08-02T00:00:00Z',
    },
    {
      platform: 'instagram',
      caption: 'Top three #serve',
      engagement_score: 30,
      reactions: 3,
      posted_at_utc: '2026-08-03T00:00:00Z',
    },
    {
      platform: 'instagram',
      caption: 'Recent short',
      engagement_score: 5,
      reactions: 1,
      posted_at_utc: '2026-08-10T00:00:00Z',
    },
    {
      platform: 'instagram',
      caption: 'Recent also short #one',
      engagement_score: 4,
      reactions: 1,
      posted_at_utc: '2026-08-11T00:00:00Z',
    },
  ]);
  assert.match(rich, /Caption craft patterns/i);
  assert.match(rich, /instagram/i);
  assert.match(rich, /hashtags/i);
  assert.match(rich, /words/i);
}

console.log('captionIntelligence.selftest: PASS');
