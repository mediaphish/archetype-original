/**
 * Journal-launch scheduling: header image on rows + failed-row reuse.
 * Run: node lib/ao/scheduleJournalLaunchCaptions.selftest.mjs
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
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

const src = fs.readFileSync(path.join(ROOT, 'lib/ao/scheduleJournalLaunchCaptions.js'), 'utf8');
assert.ok(/image_url: draftImageUrl/.test(src), 'scheduled rows must copy the draft header image');
assert.ok(!/\.neq\(\s*['"]status['"]\s*,\s*['"]failed['"]\s*\)/.test(src), 'dedup must not ignore failed rows');
assert.ok(/pickJournalLaunchRowToReuse/.test(src), 'retries reuse an existing row');
assert.ok(/error_message: null/.test(src), 'reuse clears the previous failure message');

const { pickJournalLaunchRowToReuse } = await import('./scheduleJournalLaunchCaptions.js');

const existing = [
  { id: 'fail-new', platform: 'instagram', account_id: 'meta', status: 'failed', updated_at: '2026-08-17T00:00:00Z' },
  { id: 'fail-old', platform: 'instagram', account_id: 'meta', status: 'failed', updated_at: '2026-08-16T00:00:00Z' },
  { id: 'sched', platform: 'instagram', account_id: 'ig_mediaphish', status: 'scheduled', updated_at: '2026-08-17T01:00:00Z' },
  { id: 'live', platform: 'linkedin', account_id: 'personal', status: 'posted', updated_at: '2026-08-17T12:00:00Z' },
];

assert.strictEqual(pickJournalLaunchRowToReuse(existing, 'instagram', 'meta').id, 'fail-new');
assert.strictEqual(pickJournalLaunchRowToReuse(existing, 'instagram', 'ig_mediaphish').id, 'sched');
assert.strictEqual(pickJournalLaunchRowToReuse(existing, 'linkedin', 'personal').status, 'posted');
assert.strictEqual(pickJournalLaunchRowToReuse(existing, 'facebook', 'meta'), null);

const mixed = [
  { id: 'fail', platform: 'instagram', account_id: 'meta', status: 'failed' },
  { id: 'sched', platform: 'instagram', account_id: 'meta', status: 'scheduled' },
];
assert.strictEqual(
  pickJournalLaunchRowToReuse(mixed, 'instagram', 'meta').id,
  'sched',
  'prefer the scheduled row over a failed duplicate'
);

console.log('scheduleJournalLaunchCaptions.selftest: PASS');
