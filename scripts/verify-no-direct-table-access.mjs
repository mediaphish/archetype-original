#!/usr/bin/env node
/**
 * Build-time gate: fail if api/ or lib/ touch ao_scheduled_posts, ao_content_drafts,
 * or ao_content_draft_versions outside the sanctioned lib/db modules.
 *
 * Allowed:
 *   lib/db/scheduledPosts.js
 *   lib/db/contentDrafts.js
 *   lib/db/contentDraftVersions.js
 *
 * Run: node scripts/verify-no-direct-table-access.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = [path.join(ROOT, 'api'), path.join(ROOT, 'lib')];

const TABLES = [
  {
    name: 'ao_scheduled_posts',
    // Match .from('ao_scheduled_posts') / .from("ao_scheduled_posts")
    pattern: /\.from\(\s*['"]ao_scheduled_posts['"]\s*\)/g,
    allow: [path.join(ROOT, 'lib', 'db', 'scheduledPosts.js')],
  },
  {
    name: 'ao_content_drafts',
    pattern: /\.from\(\s*['"]ao_content_drafts['"]\s*\)/g,
    allow: [path.join(ROOT, 'lib', 'db', 'contentDrafts.js')],
  },
  {
    name: 'ao_content_draft_versions',
    pattern: /\.from\(\s*['"]ao_content_draft_versions['"]\s*\)/g,
    allow: [path.join(ROOT, 'lib', 'db', 'contentDraftVersions.js')],
  },
];

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'backups', '.git']);
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (CODE_EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p);
}

const files = SCAN_DIRS.flatMap((d) => walk(d));
const violations = [];

for (const file of files) {
  const abs = path.resolve(file);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const table of TABLES) {
    const allowed = table.allow.some((a) => path.resolve(a) === abs);
    if (allowed) continue;

    const matches = raw.match(table.pattern);
    if (!matches?.length) continue;

    violations.push({
      file: rel(file),
      table: table.name,
      count: matches.length,
    });
  }
}

if (violations.length > 0) {
  console.error(
    'Direct table access blocked. Use lib/db/scheduledPosts.js or lib/db/contentDrafts.js instead.\n'
  );
  for (const v of violations) {
    console.error(`  ${v.file} — ${v.count}× .from('${v.table}')`);
  }
  console.error(
    '\nNew writers for these tables must go through the sanctioned module (and be added to scripts/verify-no-direct-table-access.mjs only if creating a new table gate).'
  );
  process.exit(1);
}

console.log(
  'verify-no-direct-table-access: ok (ao_scheduled_posts + ao_content_drafts + ao_content_draft_versions only via lib/db)'
);
process.exit(0);
