#!/usr/bin/env node
/**
 * One-time script: fix incorrect featured_image paths in journal frontmatter.
 *
 * Every entry published before the publish-journal.js path fix has:
 *   featured_image: ../../public/images/[slug].jpg
 *
 * The build script only rewrites paths starting with ../images/
 * so those entries silently render without images.
 *
 * This script rewrites all occurrences to the correct pattern:
 *   featured_image: ../images/[slug].jpg
 */

import fs from 'fs';
import path from 'path';

const JOURNAL_DIR = 'ao-knowledge-hq-kit/journal';
const WRONG_PATTERN = /^featured_image:\s*\.\.\/\.\.\/public\/images\//m;
const CORRECT_REPLACEMENT = 'featured_image: ../images/';

function walkDir(dir) {
  const files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (item.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

let fixed = 0;
let skipped = 0;

for (const filePath of walkDir(JOURNAL_DIR)) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (WRONG_PATTERN.test(content)) {
    const updated = content.replace(
      /^(featured_image:\s*)\.\.\/\.\.\/public\/images\//m,
      '$1../images/'
    );
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}`);
