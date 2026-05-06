#!/usr/bin/env node
/**
 * One-time (idempotent): set status: published on long-form journal markdown
 * that has no status field, so build-knowledge can require explicit approval going forward.
 * Skips ao-knowledge-hq-kit/journal/devotionals/ (devotionals already use status).
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function walkJournalMd(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'devotionals') continue;
      walkJournalMd(p, acc);
    } else if (name.endsWith('.md') && name.toLowerCase() !== 'template.md') {
      acc.push(p);
    }
  }
  return acc;
}

const root = path.join(process.cwd(), 'ao-knowledge-hq-kit', 'journal');
if (!fs.existsSync(root)) {
  console.log('No journal directory; nothing to do.');
  process.exit(0);
}

const files = walkJournalMd(root);
let updated = 0;
let skipped = 0;

for (const filePath of files) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  if (data.status !== undefined && String(data.status).trim() !== '') {
    skipped++;
    continue;
  }
  data.status = 'published';
  fs.writeFileSync(filePath, matter.stringify(content, data), 'utf8');
  updated++;
  console.log(`+ status: published → ${path.relative(process.cwd(), filePath)}`);
}

console.log(`\nDone. Updated ${updated} file(s), left ${skipped} unchanged (already had status).`);
