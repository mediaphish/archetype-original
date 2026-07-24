#!/usr/bin/env node
/**
 * Regenerate backups/_cleanup_quarantine/RESTORE_MAP.md from MANIFEST.json.
 *
 * Usage:
 *   npm run cleanup:map
 *   node scripts/cleanup-map.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUARANTINE_ROOT = path.join(ROOT, 'backups', '_cleanup_quarantine');
const MANIFEST_PATH = path.join(QUARANTINE_ROOT, 'MANIFEST.json');
const MAP_PATH = path.join(QUARANTINE_ROOT, 'RESTORE_MAP.md');

export function writeRestoreMap() {
  let manifest = { entries: [] };
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  }

  const lines = [];
  lines.push('# Cleanup Quarantine — Restore Map');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('This map shows every file moved aside during cleanup, where it went, and how to bring it back.');
  lines.push('Nothing is permanently deleted until you explicitly say so after living with the change.');
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  lines.push('- List everything: `npm run cleanup:restore -- --list`');
  lines.push('- Restore one batch: `npm run cleanup:restore -- --batch <batch-name>`');
  lines.push('- Restore one file: `npm run cleanup:restore -- --file <original_path>`');
  lines.push('- Refresh this map: `npm run cleanup:map`');
  lines.push('');

  if (!manifest.entries.length) {
    lines.push('_No entries yet._');
    lines.push('');
  } else {
    const byBatch = new Map();
    for (const e of manifest.entries) {
      if (!byBatch.has(e.batch)) byBatch.set(e.batch, []);
      byBatch.get(e.batch).push(e);
    }

    for (const [batch, entries] of byBatch) {
      lines.push(`## Batch: \`${batch}\``);
      lines.push('');
      for (const e of entries) {
        lines.push(`### \`${e.original_path}\``);
        lines.push('');
        lines.push(`- **Status:** ${e.status}`);
        lines.push(`- **Date:** ${e.date_quarantined}`);
        lines.push(`- **Reason:** ${e.reason}`);
        lines.push(`- **Confidence:** ${e.confidence || 'n/a'}`);
        lines.push(`- **Was tracked in git:** ${e.was_tracked_in_git}`);
        lines.push(`- **Quarantine copy committed:** ${e.committed}`);
        if (e.quarantine_path) {
          lines.push(`- **Quarantine path:** \`${e.quarantine_path}\``);
        }
        if (e.status === 'removed_via_git_rm') {
          lines.push('- **How to restore (run these yourself — the restore script will only print them):**');
          lines.push('  1. `git rev-list -n 1 HEAD -- ' + e.original_path + '`');
          lines.push('  2. `git checkout <that-sha> -- ' + e.original_path + '`');
          lines.push('  (Use the commit that still contained the file — do **not** add `^` after the sha.)');
        } else if (e.quarantine_path) {
          lines.push(`- **How to restore:** \`npm run cleanup:restore -- --file ${e.original_path}\``);
        }
        if (e.recovery_note) {
          lines.push(`- **Note:** ${e.recovery_note}`);
        }
        lines.push('');
      }
    }
  }

  fs.mkdirSync(QUARANTINE_ROOT, { recursive: true });
  fs.writeFileSync(MAP_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, MAP_PATH)}`);
  return MAP_PATH;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeRestoreMap();
}
