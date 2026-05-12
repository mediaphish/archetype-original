#!/usr/bin/env node
/**
 * One-time (idempotent): set status: published on long-form journal markdown
 * that has no status field, so build-knowledge can require explicit approval going forward.
 * Skips ao-knowledge-hq-kit/journal/devotionals/ (devotionals already use status).
 *
 * Safety: never stamps published on files that still contain Rich Text, lack a
 * parseable title, or do not start with YAML frontmatter — those need human repair first.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/** True if the file still looks like TextEdit/Word RTF pasted into a .md file. */
function looksLikeRtfInMarkdown(s) {
  if (!s || typeof s !== 'string') return false;
  return /\{\\rtf|\\rtf1\b/i.test(s);
}

function looksEligibleForStatusPublishedMigration(raw) {
  const t = raw.trimStart();
  if (!t.startsWith('---')) return false;
  if (looksLikeRtfInMarkdown(raw)) return false;
  const { data } = matter(raw);
  const title = data?.title;
  if (title === undefined || title === null || String(title).trim() === '') return false;
  return true;
}

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
  if (!looksEligibleForStatusPublishedMigration(raw)) {
    console.warn(
      `⏭️  skip (not safe to auto-publish): ${path.relative(process.cwd(), filePath)} — repair markdown / remove RTF / add title in frontmatter first`,
    );
    skipped++;
    continue;
  }
  if (looksLikeRtfInMarkdown(content)) {
    console.warn(
      `⏭️  skip (RTF still in body after frontmatter): ${path.relative(process.cwd(), filePath)}`,
    );
    skipped++;
    continue;
  }
  data.status = 'published';
  fs.writeFileSync(filePath, matter.stringify(content, data), 'utf8');
  updated++;
  console.log(`+ status: published → ${path.relative(process.cwd(), filePath)}`);
}

console.log(
  `\nDone. Updated ${updated} file(s); skipped ${skipped} (already had status, or not eligible for auto-publish).`,
);
