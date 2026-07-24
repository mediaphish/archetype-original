#!/usr/bin/env node

/**
 * Disable pre-rendering on commit so commits stay fast (no 8–10 min delay).
 * Run once per clone: node scripts/disable-prerender-on-commit.mjs
 * See notes/PRERENDER.md for when to run prerender manually.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const hookPath = join(rootDir, '.git', 'hooks', 'post-commit');

const content = `#!/bin/sh
# Pre-render moved off commit to avoid 8-10 min delay. Run npm run prerender:local when needed.
exit 0
`;

try {
  mkdirSync(join(rootDir, '.git', 'hooks'), { recursive: true });
  writeFileSync(hookPath, content);
  console.log('Done. post-commit hook is now a no-op; commits will not run prerender.');
} catch (err) {
  console.error('Could not write hook:', err.message);
  process.exit(1);
}
