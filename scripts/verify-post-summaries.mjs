/**
 * Fails the build if any published post has a broken summary.
 *
 * On 2026-08-24 The Jezebel Archetype went live with a summary that stopped
 * mid-word: "...and the law forbade him from selling it away. Ahab we". It sits
 * above the fold, in the page description, and in every share preview, so it is
 * the first thing a reader sees.
 *
 * The publisher is fixed and gated, but this is the backstop. Summaries reach
 * the site from several paths — the scheduled cron, publishJournalEntry, manual
 * edits to markdown, and the corpus builder — and a check inside one of them
 * only protects that one. This checks the artifact instead, so it catches a bad
 * summary no matter who wrote it.
 */

import fs from 'fs';
import path from 'path';
import { isTruncatedSummary } from '../lib/ao/postSummary.js';

const DIRS = ['ao-knowledge-hq-kit/journal', 'ao-knowledge-hq-kit/journal/devotionals'];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name));
}

/** Pull the summary out of YAML frontmatter, handling the folded `>-` form. */
function readSummary(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const block = fm[1];

  const folded = block.match(/^summary:\s*>-?\s*\n((?:[ \t]+.*\n?)+)/m);
  if (folded) {
    return folded[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');
  }

  const inline = block.match(/^summary:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m);
  if (inline) return (inline[1] ?? inline[2] ?? inline[3] ?? '').trim();

  return null;
}

function isPublished(text) {
  return /^status:\s*published\s*$/m.test(text);
}

const failures = [];
let checked = 0;

for (const dir of DIRS) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, 'utf8');
    if (!isPublished(text)) continue;

    const summary = readSummary(text);
    checked += 1;

    if (summary === null) {
      failures.push(`  ${file}\n      no summary in frontmatter`);
      continue;
    }
    const problem = isTruncatedSummary(summary);
    if (problem) failures.push(`  ${file}\n      ${problem}`);
  }
}

if (failures.length) {
  console.error(`Broken summaries in ${failures.length} published post(s). Build stopped.\n`);
  console.error(failures.join('\n\n'));
  console.error(
    '\nA summary is the first thing a reader sees, on the page and in every share preview.' +
      '\nRewrite it to end on a complete sentence. Do not simply pad it to length.'
  );
  process.exit(1);
}

console.log(`verify-post-summaries: OK (${checked} published posts, all summaries intact)`);
