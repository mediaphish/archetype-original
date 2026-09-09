/**
 * Fails the build when a NEW voice violation reaches the published corpus.
 *
 * The gap this closes, found 2026-09-09. Voice was checked at save_draft and
 * nowhere else. `verify-post-summaries.mjs` fails the build on a broken summary;
 * nothing did the equivalent for voice, so a banned phrase already in a
 * published file stayed there, invisible, forever.
 *
 * WHY THIS IS A RATCHET AND NOT A HARD FAIL.
 *
 * The first scan found 93 violations across 57 of 358 published files,
 * including 25 instances of "sit with" and 9 em dashes in live prose. A check
 * that failed on all of them would have failed on day one, which means it would
 * have been switched off within the hour and never switched back on.
 *
 * So the existing 93 are baselined into voice-baseline.json and reported at
 * every build, and anything NEW fails. The count can only go down. Editing 57
 * published posts is Bart's decision about his own writing, not something a
 * build script does quietly at 2am.
 *
 * To clean one up: fix the prose, then run this with --update to shrink the
 * baseline. The baseline is a debt register, not a permission slip.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { detectVoiceViolationsInProse } from '../lib/ao/voiceGuardrails.js';

const DIRS = ['ao-knowledge-hq-kit/journal', 'ao-knowledge-hq-kit/journal/devotionals'];
const BASELINE = 'scripts/voice-baseline.json';
const UPDATE = process.argv.includes('--update');

/** slug -> { id: count } for every published file with violations. */
function scan() {
  const found = {};
  let scanned = 0;

  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      let parsed;
      try {
        parsed = matter(raw);
      } catch {
        continue; // frontmatter problems are verify-post-summaries' job
      }
      if (String(parsed.data?.status) !== 'published') continue;
      scanned += 1;

      // Body only. Frontmatter carries slugs and dates, not prose.
      const hits = detectVoiceViolationsInProse(parsed.content).filter((v) => !v.soft);
      if (!hits.length) continue;

      const slug = String(parsed.data?.slug || file.replace(/\.md$/, ''));
      const counts = {};
      for (const h of hits) counts[h.id] = (counts[h.id] || 0) + 1;
      found[slug] = counts;
    }
  }

  return { found, scanned };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files || {};
  } catch {
    return {};
  }
}

function totalOf(map) {
  return Object.values(map).reduce((sum, counts) => sum + Object.values(counts).reduce((a, b) => a + b, 0), 0);
}

const { found, scanned } = scan();

if (UPDATE) {
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: 'Known voice violations in already-published posts. New ones fail the build. This number should only go down.',
        updated: new Date().toISOString().split('T')[0],
        total: totalOf(found),
        files: found,
      },
      null,
      2
    )}\n`
  );
  console.log(`verify-voice: baseline updated — ${totalOf(found)} known violation(s) in ${Object.keys(found).length} file(s)`);
  process.exit(0);
}

const baseline = loadBaseline();
const regressions = [];

for (const [slug, counts] of Object.entries(found)) {
  const known = baseline[slug] || {};
  for (const [id, count] of Object.entries(counts)) {
    const allowed = known[id] || 0;
    if (count > allowed) {
      regressions.push(`  ${slug}\n      ${id}: ${count} found, ${allowed} baselined`);
    }
  }
}

const knownTotal = totalOf(baseline);
const foundTotal = totalOf(found);

if (regressions.length) {
  console.error(`\nNEW voice violations in published posts. Build stopped.\n`);
  console.error(regressions.join('\n\n'));
  console.error(
    `\nThese are banned patterns from lib/ao/voiceGuardrails.js, the same list that blocks a draft save.` +
      `\nFix the prose. Do not delete the punctuation and leave a broken sentence.` +
      `\nIf a pattern is wrong rather than the writing, change the pattern in voiceGuardrails.js.\n`
  );
  process.exit(1);
}

if (foundTotal < knownTotal) {
  console.log(
    `verify-voice: OK (${scanned} published posts). ${knownTotal - foundTotal} violation(s) cleaned since the baseline — ` +
      `run "node scripts/verify-voice.mjs --update" to lock the improvement in.`
  );
} else {
  console.log(
    `verify-voice: OK (${scanned} published posts, ${foundTotal} known violation(s) carried in the baseline)`
  );
}
