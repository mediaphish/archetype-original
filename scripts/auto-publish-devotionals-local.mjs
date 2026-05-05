#!/usr/bin/env node
/**
 * Auto-publish devotionals that have been added/edited locally.
 *
 * What this does:
 * - Finds changed devotional markdown files in ao-knowledge-hq-kit/journal/devotionals/
 * - Refuses to run if there are other unrelated local changes (safety)
 * - Runs a duplicate/overlap safety check (date/slug/scripture + high similarity)
 * - Rebuilds public/knowledge.json
 * - Commits the devotionals + knowledge index
 * - Syncs with origin/main (resolving knowledge.json conflict by keeping ours)
 * - Pushes to origin/main so the live site updates
 *
 * This is intended to be run on a schedule (e.g., nightly) as a safety net.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const DEVOTIONALS_DIR = path.join(ROOT, 'ao-knowledge-hq-kit', 'journal', 'devotionals');
const KNOWLEDGE_JSON = path.join(ROOT, 'public', 'knowledge.json');
const NOTES_DIR = path.join(ROOT, 'notes');
const REPORT_PATH = path.join(NOTES_DIR, 'DEVOTIONAL_AUTO_PUBLISH_REPORT.md');

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
  return res;
}

function fail(message, details = '') {
  const body = [
    `# Devotional auto-publish report`,
    ``,
    `Status: **STOPPED**`,
    ``,
    `Reason: ${message}`,
    details ? `` : null,
    details ? details.trim() : null,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, body, 'utf8');
  } catch {
    // ignore report write failures
  }

  console.error(message);
  if (details) console.error(details);
  process.exit(2);
}

function normalizeRef(ref) {
  if (!ref) return '';
  let r = String(ref).trim();
  r = r.replace(/\s*\(ESV\)\s*$/i, '');
  r = r.replace(/–|—/g, '-');
  r = r.replace(/\s+/g, ' ');
  return r.trim();
}

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const A = normalizeText(a);
  const B = normalizeText(b);
  if (!A || !B) return 0;
  // lightweight similarity: overlap of tokens + simple ratio
  // (good enough as a guardrail, not an NLP classifier)
  const aTokens = new Set(A.split(' '));
  const bTokens = new Set(B.split(' '));
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap++;
  const jaccard = overlap / Math.max(1, aTokens.size + bTokens.size - overlap);
  return jaccard;
}

function parseGitStatusPorcelain() {
  const res = sh('git', ['status', '--porcelain']);
  if (res.status !== 0) {
    fail('Unable to read git status.', res.stderr || res.stdout);
  }
  const lines = (res.stdout || '').split('\n').map((l) => l.trimEnd()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    // Format: XY <path>  (or '?? <path>')
    const m = line.match(/^(\?\?|[ MADRCU][ MADRCU])\s+(.+)$/);
    if (!m) continue;
    const code = m[1];
    let filePath = m[2];
    // Handle rename: "R  old -> new"
    const arrow = filePath.indexOf(' -> ');
    if (arrow !== -1) filePath = filePath.slice(arrow + 4);
    entries.push({ code, path: filePath });
  }
  return entries;
}

function listAllDevotionalFiles() {
  if (!fs.existsSync(DEVOTIONALS_DIR)) return [];
  return fs
    .readdirSync(DEVOTIONALS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .filter((f) => f.toLowerCase() !== 'template.md')
    .filter((f) => !f.toLowerCase().endsWith('.md.md'))
    .map((f) => path.join(DEVOTIONALS_DIR, f));
}

function readFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data || {};
  return {
    filePath,
    filename: path.basename(filePath),
    title: String(data.title ?? '').trim(),
    slug: String(data.slug ?? '').trim(),
    status: String(data.status ?? '').trim(),
    publishDate: String(data.publish_date ?? data.date ?? '').trim().split('T')[0].split(' ')[0],
    scriptureRef: normalizeRef(data.scripture_reference ?? ''),
    summary: String(data.summary ?? '').trim(),
    // for similarity checks (keep short)
    bodyPreview: String(parsed.content ?? '').slice(0, 1600),
  };
}

function ensureCleanScope(entries) {
  const allowedPrefixes = [
    'ao-knowledge-hq-kit/journal/devotionals/',
    'public/knowledge.json',
  ];
  const disallowed = entries
    .map((e) => e.path)
    .filter((p) => !allowedPrefixes.some((pref) => p.startsWith(pref)));
  if (disallowed.length) {
    fail(
      'There are unrelated local changes, so auto-publish refused to run.',
      [
        `Unrelated changes found:`,
        ...disallowed.map((p) => `- ${p}`),
        ``,
        `Fix: either commit/revert those changes, or move them out of the repo, then re-run.`,
      ].join('\n')
    );
  }
}

function findChangedDevotionals(entries) {
  const changed = entries
    .map((e) => e.path)
    .filter((p) => p.startsWith('ao-knowledge-hq-kit/journal/devotionals/'))
    .filter((p) => p.toLowerCase().endsWith('.md'));
  // De-dupe
  return [...new Set(changed)];
}

function checkOverlaps(incomingFiles) {
  const allFiles = listAllDevotionalFiles();
  const all = allFiles.map(readFrontmatter);

  const incomingAbs = new Set(incomingFiles.map((p) => path.join(ROOT, p)));
  const incoming = all.filter((d) => incomingAbs.has(d.filePath));
  const existing = all.filter((d) => !incomingAbs.has(d.filePath));

  const conflicts = [];

  const byDate = new Map();
  const bySlug = new Map();
  const byRef = new Map();

  for (const d of existing) {
    if (d.publishDate) byDate.set(d.publishDate, (byDate.get(d.publishDate) || []).concat(d));
    if (d.slug) bySlug.set(d.slug, (bySlug.get(d.slug) || []).concat(d));
    if (d.scriptureRef) byRef.set(d.scriptureRef.toLowerCase(), (byRef.get(d.scriptureRef.toLowerCase()) || []).concat(d));
  }

  for (const inc of incoming) {
    const sameDate = inc.publishDate ? (byDate.get(inc.publishDate) || []) : [];
    const sameSlug = inc.slug ? (bySlug.get(inc.slug) || []) : [];
    const sameRef = inc.scriptureRef ? (byRef.get(inc.scriptureRef.toLowerCase()) || []) : [];

    if (sameDate.length || sameSlug.length || sameRef.length) {
      conflicts.push({
        incoming: inc,
        sameDate,
        sameSlug,
        sameRef,
      });
    }
  }

  // Similarity warnings (topic repeats)
  const similarityHits = [];
  const TITLE_JACCARD = 0.78;
  const SUMMARY_JACCARD = 0.78;

  for (const inc of incoming) {
    for (const ex of existing) {
      const t = similarity(inc.title, ex.title);
      const s = similarity(inc.summary, ex.summary);
      if (t >= TITLE_JACCARD || s >= SUMMARY_JACCARD) {
        similarityHits.push({ inc, ex, t: t.toFixed(2), s: s.toFixed(2) });
      }
    }
  }

  if (!conflicts.length && !similarityHits.length) return;

  const details = [];
  details.push(`## Incoming files checked`);
  for (const inc of incoming) {
    details.push(`- \`${inc.filename}\` — ${inc.publishDate || '(no date)'} — \`${inc.slug || '(no slug)'}\` — ${inc.scriptureRef || '(no scripture)'} `);
  }
  details.push('');

  if (conflicts.length) {
    details.push(`## STOP: exact overlaps found`);
    details.push(`These must be resolved before publishing.`);
    details.push('');
    for (const c of conflicts) {
      details.push(`### Incoming: \`${c.incoming.filename}\``);
      if (c.sameDate.length) {
        details.push(`- Same publish date (${c.incoming.publishDate}):`);
        for (const d of c.sameDate) details.push(`  - \`${d.filename}\` (${d.title})`);
      }
      if (c.sameSlug.length) {
        details.push(`- Same slug (\`${c.incoming.slug}\`):`);
        for (const d of c.sameSlug) details.push(`  - \`${d.filename}\` (${d.title})`);
      }
      if (c.sameRef.length) {
        details.push(`- Same scripture (${c.incoming.scriptureRef}):`);
        for (const d of c.sameRef) details.push(`  - \`${d.filename}\` (${d.title})`);
      }
      details.push('');
    }
  }

  if (similarityHits.length) {
    details.push(`## Review: possible topic repeats`);
    details.push(`These aren’t always wrong, but they should be reviewed before publishing.`);
    details.push('');
    for (const hit of similarityHits.slice(0, 20)) {
      details.push(`- Incoming \`${hit.inc.filename}\` (“${hit.inc.title}”) ↔ Existing \`${hit.ex.filename}\` (“${hit.ex.title}”) [title ${hit.t}, summary ${hit.s}]`);
    }
    if (similarityHits.length > 20) {
      details.push(`- (and ${similarityHits.length - 20} more...)`);
    }
    details.push('');
  }

  fail('Overlap check flagged issues. No changes were published.', details.join('\n'));
}

function main() {
  if (!fs.existsSync(DEVOTIONALS_DIR)) {
    fail('Devotionals folder not found.', `Expected: ${DEVOTIONALS_DIR}`);
  }

  const statusEntries = parseGitStatusPorcelain();
  if (!statusEntries.length) {
    console.log('No local changes found. Nothing to publish.');
    return;
  }

  ensureCleanScope(statusEntries);

  const changedDevotionals = findChangedDevotionals(statusEntries);
  if (!changedDevotionals.length) {
    console.log('No devotional changes found. Nothing to publish.');
    return;
  }

  // Guardrail: check overlaps before publishing
  checkOverlaps(changedDevotionals);

  // Rebuild knowledge index
  const buildRes = sh('node', ['scripts/build-knowledge.mjs'], { cwd: ROOT });
  if (buildRes.status !== 0) {
    fail('Failed to refresh the site content list.', buildRes.stderr || buildRes.stdout);
  }

  // Stage devotionals + knowledge.json
  const addArgs = ['add', ...changedDevotionals];
  if (fs.existsSync(KNOWLEDGE_JSON)) addArgs.push('public/knowledge.json');
  const addRes = sh('git', addArgs, { cwd: ROOT });
  if (addRes.status !== 0) {
    fail('Failed to stage changes for publishing.', addRes.stderr || addRes.stdout);
  }

  // Commit (only if there is something staged)
  const stagedCheck = sh('git', ['diff', '--staged', '--quiet'], { cwd: ROOT });
  if (stagedCheck.status === 0) {
    console.log('No staged changes after staging. Nothing to publish.');
    return;
  }

  const count = changedDevotionals.length;
  const commitMsg = `chore(devotionals): auto-publish (${count} file${count === 1 ? '' : 's'})`;
  const commitRes = sh('git', ['commit', '-m', commitMsg], { cwd: ROOT });
  if (commitRes.status !== 0) {
    fail('Failed to create the publish commit.', commitRes.stderr || commitRes.stdout);
  }

  // Sync with origin/main (merge) and resolve the common conflict safely
  const pullRes = sh('git', ['pull', 'origin', 'main', '--no-rebase'], { cwd: ROOT });
  if (pullRes.status !== 0) {
    const combined = `${pullRes.stdout}\n${pullRes.stderr}`.trim();
    // If the only conflict is public/knowledge.json, keep ours.
    if (combined.includes('CONFLICT') && fs.existsSync(KNOWLEDGE_JSON)) {
      const oursRes = sh('git', ['checkout', '--ours', 'public/knowledge.json'], { cwd: ROOT });
      if (oursRes.status !== 0) {
        fail('Merge conflict occurred and could not keep our knowledge index.', oursRes.stderr || oursRes.stdout);
      }
      const addOurs = sh('git', ['add', 'public/knowledge.json'], { cwd: ROOT });
      if (addOurs.status !== 0) {
        fail('Failed to stage conflict resolution.', addOurs.stderr || addOurs.stdout);
      }
      const mergeCommit = sh('git', ['commit', '-m', 'Merge origin/main; keep knowledge index update'], { cwd: ROOT });
      if (mergeCommit.status !== 0) {
        fail('Failed to complete merge commit.', mergeCommit.stderr || mergeCommit.stdout);
      }
    } else {
      fail('Sync failed and requires manual review.', combined);
    }
  }

  // Push
  const pushRes = sh('git', ['push', 'origin', 'main'], { cwd: ROOT });
  if (pushRes.status !== 0) {
    fail('Push failed (publishing did not complete).', pushRes.stderr || pushRes.stdout);
  }

  console.log('Published devotionals successfully.');
}

main();

