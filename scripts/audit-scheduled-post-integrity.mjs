#!/usr/bin/env node
/**
 * Standing audit: flag status='scheduled' rows that would fail today's integrity gate.
 *
 * Usage:
 *   node scripts/audit-scheduled-post-integrity.mjs
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (loads .env.local / .env when present)
 *
 * Prints to stdout only — no writes.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { validateScheduledPostRow } from '../lib/social/scheduledPostIntegrity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = await readFile(filePath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadEnvFile(join(ROOT, '.env.local'));
await loadEnvFile(join(ROOT, '.env'));

const missingEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE = 500;
let from = 0;
const bad = [];
let scanned = 0;

for (;;) {
  const { data, error } = await supabase
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, text, caption, status, source_kind, scheduled_at')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .range(from, from + PAGE - 1);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const rows = data || [];
  if (rows.length === 0) break;

  for (const row of rows) {
    scanned += 1;
    const result = validateScheduledPostRow(row);
    if (!result.ok) {
      bad.push({
        id: row.id,
        platform: row.platform,
        source_kind: row.source_kind,
        scheduled_at: row.scheduled_at,
        reason: result.reason,
        text_preview: String(row.text || '').slice(0, 80),
        caption_preview: String(row.caption || '').slice(0, 80),
      });
    } else if (result.row.text !== String(row.text || '').trim() || result.row.caption !== String(row.caption || '').trim()) {
      // Would heal on re-insert; still report drift so it can be fixed in place
      bad.push({
        id: row.id,
        platform: row.platform,
        source_kind: row.source_kind,
        scheduled_at: row.scheduled_at,
        reason: 'text/caption drift (would sync on next integrity pass)',
        text_preview: String(row.text || '').slice(0, 80),
        caption_preview: String(row.caption || '').slice(0, 80),
      });
    }
  }

  if (rows.length < PAGE) break;
  from += PAGE;
}

console.log(`Scanned ${scanned} scheduled row(s).`);
if (bad.length === 0) {
  console.log('OK: no scheduled rows would fail today\'s integrity checks.');
  process.exit(0);
}

console.log(`FOUND ${bad.length} problem row(s):\n`);
for (const row of bad) {
  console.log(
    `- ${row.id} | ${row.platform} | ${row.source_kind || '—'} | ${row.scheduled_at}\n  reason: ${row.reason}\n  text: ${JSON.stringify(row.text_preview)}\n  caption: ${JSON.stringify(row.caption_preview)}`
  );
}
process.exit(1);
