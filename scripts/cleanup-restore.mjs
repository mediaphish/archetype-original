#!/usr/bin/env node
/**
 * Restore files from backups/_cleanup_quarantine/ using MANIFEST.json.
 *
 * Usage:
 *   npm run cleanup:restore -- --list
 *   npm run cleanup:restore -- --batch 2026-07-24-zero-risk-junk
 *   npm run cleanup:restore -- --file path/to/original
 *
 * Never deletes. For status "removed_via_git_rm", prints recovery commands only
 * (does not run git).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUARANTINE_ROOT = path.join(ROOT, 'backups', '_cleanup_quarantine');
const MANIFEST_PATH = path.join(QUARANTINE_ROOT, 'MANIFEST.json');

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { entries: [] };
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  fs.mkdirSync(QUARANTINE_ROOT, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function usage() {
  console.log(`Usage:
  npm run cleanup:restore -- --list
  npm run cleanup:restore -- --batch <batch-name>
  npm run cleanup:restore -- --file <original_path>
`);
}

function printList(manifest) {
  if (!manifest.entries.length) {
    console.log('Manifest is empty — nothing quarantined yet.');
    return;
  }
  for (const e of manifest.entries) {
    console.log('---');
    console.log(`Original:   ${e.original_path}`);
    console.log(`Batch:      ${e.batch}`);
    console.log(`Date:       ${e.date_quarantined}`);
    console.log(`Status:     ${e.status}`);
    console.log(`Reason:     ${e.reason}`);
    if (e.quarantine_path) console.log(`Quarantine: ${e.quarantine_path}`);
    if (e.recovery_note) console.log(`Recovery:   ${e.recovery_note}`);
    console.log(`Tracked:    ${e.was_tracked_in_git} | Committed in quarantine: ${e.committed}`);
  }
}

function gitHistoryRecoveryCommands(originalPath) {
  return [
    `git rev-list -n 1 HEAD -- ${originalPath}`,
    `git checkout <that-sha> -- ${originalPath}`,
  ];
}

function restoreEntry(entry, manifest) {
  const originalAbs = path.join(ROOT, entry.original_path);

  if (entry.status === 'removed_via_git_rm' || (!entry.quarantine_path && entry.status !== 'restored')) {
    const cmds = gitHistoryRecoveryCommands(entry.original_path);
    console.log(`\n[git-history] ${entry.original_path}`);
    console.log('  This file was removed via git rm (no quarantine copy).');
    console.log('  Run these yourself (script will not run git):');
    console.log(`    1) ${cmds[0]}`);
    console.log(`    2) ${cmds[1]}`);
    console.log('  Manifest status left unchanged until you restore manually and ask for an update.');
    return { restored: false, printedOnly: true };
  }

  if (!entry.quarantine_path) {
    console.error(`[skip] No quarantine_path for ${entry.original_path}`);
    return { restored: false };
  }

  const qAbs = path.join(ROOT, entry.quarantine_path);
  if (!fs.existsSync(qAbs)) {
    console.error(`[error] Quarantine copy missing: ${entry.quarantine_path}`);
    return { restored: false, error: true };
  }

  fs.mkdirSync(path.dirname(originalAbs), { recursive: true });
  fs.copyFileSync(qAbs, originalAbs);
  entry.status = 'restored';
  console.log(`[restored] ${entry.original_path}  ←  ${entry.quarantine_path}`);
  return { restored: true };
}

function parseArgs(argv) {
  const args = { list: false, batch: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') args.list = true;
    else if (a === '--batch') args.batch = argv[++i];
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function maybeRegenMap() {
  try {
    const mapMod = await import('./cleanup-map.mjs');
    if (typeof mapMod.writeRestoreMap === 'function') {
      mapMod.writeRestoreMap();
    }
  } catch (err) {
    console.warn('[warn] Could not regenerate RESTORE_MAP.md:', err?.message || err);
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.list && !args.batch && !args.file)) {
  usage();
  process.exit(args.help ? 0 : 1);
}

const manifest = loadManifest();

if (args.list) {
  printList(manifest);
  process.exit(0);
}

let targets = [];
if (args.batch) {
  targets = manifest.entries.filter((e) => e.batch === args.batch);
  if (!targets.length) {
    console.error(`No entries for batch: ${args.batch}`);
    process.exit(1);
  }
} else if (args.file) {
  const file = args.file.replace(/^\.\//, '');
  targets = manifest.entries.filter((e) => e.original_path === file);
  if (!targets.length) {
    console.error(`No manifest entry for: ${file}`);
    process.exit(1);
  }
}

let restoredCount = 0;
for (const entry of targets) {
  const result = restoreEntry(entry, manifest);
  if (result.restored) restoredCount++;
}

saveManifest(manifest);
await maybeRegenMap();
console.log(`\nDone. Restored ${restoredCount} file(s). Manifest updated.`);
