#!/usr/bin/env node
/**
 * Verify dist/llms.txt and dist/llms-full.txt after copy-public-to-dist.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');

const MIN_FULL_BYTES = 50 * 1024;
let errors = 0;

function fail(msg) {
  console.error(`verify-dist-llms: ${msg}`);
  errors++;
}

const llmsPath = join(dist, 'llms.txt');
const llmsFullPath = join(dist, 'llms-full.txt');

console.log('Verifying dist/llms.txt and dist/llms-full.txt...');

if (!existsSync(llmsPath)) {
  fail(`missing ${llmsPath}`);
} else {
  const llms = readFileSync(llmsPath, 'utf8');
  if (!llms.includes('Archetype Leadership Index')) {
    fail('dist/llms.txt does not contain "Archetype Leadership Index"');
  }
}

if (!existsSync(llmsFullPath)) {
  fail(`missing ${llmsFullPath}`);
} else {
  const size = statSync(llmsFullPath).size;
  const full = readFileSync(llmsFullPath, 'utf8');
  if (size <= MIN_FULL_BYTES) {
    fail(`dist/llms-full.txt is too small (${size} bytes, need > ${MIN_FULL_BYTES})`);
  }
  if (!full.includes('Frequently Asked Questions, full text')) {
    fail('dist/llms-full.txt missing "Frequently Asked Questions, full text"');
  }
  if (!full.includes('Journal index')) {
    fail('dist/llms-full.txt missing "Journal index"');
  }
}

if (errors > 0) {
  console.error(`verify-dist-llms: ${errors} error(s)`);
  process.exit(1);
}

console.log('verify-dist-llms: all checks passed');
