#!/usr/bin/env node
/**
 * One-shot Part 1 curation pipeline (after SQL migrations are applied):
 *   1. --plan → notes/ali-instrument-v2-curation.csv
 *   2. Copy that file to notes/ali-instrument-v2-curation.approved.csv (no edits)
 *   3. --apply --confirm (writes v2.0 rows + deprecates lineage v1.x sources)
 *   4. --verify
 *   5. audit → notes/ali-instrument-v2-validation-audit.md
 *
 * Requires `.env` or `.env.local` at project root with SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (same as hosting).
 *
 * Usage:
 *   node scripts/ali/run-v2-curation-pipeline.mjs
 *
 * If you need to edit pairings first, run plan only:
 *   node scripts/ali/curate-instrument.mjs --plan
 *   (edit CSV, save as ali-instrument-v2-curation.approved.csv)
 *   node scripts/ali/curate-instrument.mjs --apply --in notes/ali-instrument-v2-curation.approved.csv --confirm
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { loadAliEnv } from './load-env.mjs';

loadAliEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const curate = path.join(__dirname, 'curate-instrument.mjs');
const audit = path.join(__dirname, 'audit-instrument-v2.mjs');

const planCsv = path.join(root, 'notes', 'ali-instrument-v2-curation.csv');
const approvedCsv = path.join(root, 'notes', 'ali-instrument-v2-curation.approved.csv');
const auditMd = path.join(root, 'notes', 'ali-instrument-v2-validation-audit.md');

function runNode(scriptPath, args) {
  execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing Supabase credentials. Add `.env` or `.env.local` at the project root with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).'
  );
  process.exit(2);
}

if (!fs.existsSync(path.join(root, 'notes'))) {
  fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
}

console.log('\n[1/5] plan →', planCsv, '\n');
runNode(curate, ['--plan', '--out', planCsv]);

if (!fs.existsSync(planCsv) || fs.readFileSync(planCsv, 'utf8').trim().length < 20) {
  console.error('Plan did not produce a usable CSV. Fix active v1.x rows (see curate output), then re-run.');
  process.exit(1);
}

console.log('\n[2/5] copy plan → approved (identical; edit approved file first if you need changes)\n');
fs.copyFileSync(planCsv, approvedCsv);

console.log('\n[3/5] apply v2.0 rows + deprecate v1.x lineage sources\n');
runNode(curate, ['--apply', '--in', approvedCsv, '--confirm']);

console.log('\n[4/5] verify paired coverage\n');
runNode(curate, ['--verify']);

console.log('\n[5/5] readability / scale audit →', auditMd, '\n');
runNode(audit, ['--out', auditMd]);

console.log('\nDone. Review:', planCsv, 'and', auditMd, '\n');
