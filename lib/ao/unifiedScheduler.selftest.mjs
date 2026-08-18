/**
 * Past-slot guard for toScheduledAt.
 * Run: node lib/ao/unifiedScheduler.selftest.mjs
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

const { ensureFutureScheduledAt, SCHEDULE_MIN_GAP_MS } = await import('./unifiedScheduler.js');

const now = new Date('2026-08-17T22:00:00.000Z');
const past = '2026-08-17T15:00:00.000Z';
const bumped = ensureFutureScheduledAt(past, { now, useOwnerClock: false, minGapMs: SCHEDULE_MIN_GAP_MS });
assert.ok(new Date(bumped).getTime() > now.getTime() + SCHEDULE_MIN_GAP_MS - 1, 'past UTC slot is pushed forward');

const future = '2026-08-19T15:00:00.000Z';
assert.strictEqual(
  ensureFutureScheduledAt(future, { now, useOwnerClock: false }),
  future,
  'future slots stay put'
);

const src = fs.readFileSync(path.join(ROOT, 'lib/ao/unifiedScheduler.js'), 'utf8');
assert.ok(/ensureFutureScheduledAt\(scheduled_at/.test(src), 'toScheduledAt uses the past-slot guard');

console.log('unifiedScheduler.selftest: PASS');
