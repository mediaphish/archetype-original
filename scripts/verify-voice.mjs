/**
 * Fails the build when a NEW voice violation reaches the published corpus.
 *
 * The gap this closes, found 2026-09-09. Voice was checked at save_draft and
 * nowhere else. `verify-post-summaries.mjs` fails the build on a broken summary;
 * nothing did the equivalent for voice, so a banned phrase already in a
 * published file stayed there, invisible, forever.
 *
 * THE BASELINE IS NOW ZERO.
 *
 * The first scan found 93 violations across 57 of 358 published files. It was
 * built as a ratchet so a check could ship without failing on day one, since a
 * build that fails on day one gets switched off within the hour.
 *
 * That debt is paid. 2026-09-09: 40 instances rewritten by hand, each in its
 * own sentence, and the rest were the detector being wrong rather than the
 * writing:
 *
 *   167 of 176 dashes were scripture references and number ranges, where an en
 *   dash is correct typography.
 *   "leverage" matched the noun, which is load-bearing in the accountability
 *   posts. "elevate" matched raising a person up, which is the whole subject.
 *   "speaks to" matched a leader literally speaking to people.
 *   "not just X, it's Y" matched across a full stop into an unrelated sentence.
 *   The scan flagged "Moreover" inside a direct quotation of 1 Samuel 28.
 *
 * Fixing patterns rather than prose is the right move whenever a rule and the
 * writing disagree, because the writing is the thing being protected.
 *
 * With the baseline at zero, any violation fails the build. Keep it there. If a
 * pattern is wrong rather than the writing, change the pattern.
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
