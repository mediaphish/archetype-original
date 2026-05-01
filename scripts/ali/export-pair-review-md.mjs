#!/usr/bin/env node
/**
 * Builds a human-readable markdown review from an approved curation CSV:
 * one section per construct — Leader wording vs Team wording — nothing else.
 *
 * Usage:
 *   node scripts/ali/export-pair-review-md.mjs
 *   node scripts/ali/export-pair-review-md.mjs --in notes/ali-instrument-v2-curation.approved.csv --out notes/ALI_V2_PAIR_REVIEW.md
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_IN = path.join(process.cwd(), 'notes', 'ali-instrument-v2-curation.approved.csv');
const DEFAULT_OUT = path.join(process.cwd(), 'notes', 'ALI_V2_PAIR_REVIEW.md');

function parseArgs(argv) {
  const out = { in: DEFAULT_IN, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--in') out.in = argv[++i];
    else if (argv[i] === '--out') out.out = argv[++i];
  }
  return out;
}

function splitCsvLines(text) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      out.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function fromCsv(text) {
  const rows = [];
  const lines = splitCsvLines(text);
  if (lines.length < 2) return rows;
  const headers = parseCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

const ARGS = parseArgs(process.argv.slice(2));

const raw = fs.readFileSync(ARGS.in, 'utf8');
const rows = fromCsv(raw);

const byConstruct = new Map();
const orphans = [];

for (const r of rows) {
  const keep = String(r.keep || '').toLowerCase();
  if (keep !== 'yes') {
    orphans.push(r);
    continue;
  }
  const cid = String(r.construct_id || '').trim();
  if (!cid) {
    orphans.push(r);
    continue;
  }
  if (!byConstruct.has(cid)) {
    byConstruct.set(cid, { pattern: r.pattern, leader: '', team: '' });
  }
  const bucket = byConstruct.get(cid);
  if (r.pattern) bucket.pattern = r.pattern;
  const text = String(r.v2_question_text || r.v1_source_text || '').trim();
  if (r.role === 'leader') bucket.leader = text;
  if (r.role === 'team_member') bucket.team = text;
}

const pairs = Array.from(byConstruct.entries()).sort((a, b) => a[0].localeCompare(b[0]));

let md = '';
md += '# ALI v2 — Paired questions (read this first)\n\n';
md +=
  'This is the **review sheet**: one idea per heading — **Leader** wording (how I lead / what I do) and **Team** wording (what people experience). ';
md +=
  'Nothing here is about spreadsheets, migrations, or database ids.\n\n';
md +=
  'Because the pilot is **not live**, we did **not** need to rewrite every line for drama. ';
md +=
  'Most stems stayed **word-identical** to the v1 bank when they were already written in the correct voice for that role. ';
md +=
  'What v2 adds is **explicit pairing** so leader and team answers can be compared fairly on the same scale.\n\n';
md += `**Constructs in this list:** ${pairs.length}\n\n`;
md += '---\n\n';

for (const [cid, { pattern, leader, team }] of pairs) {
  const label = pattern ? `${cid} · ${pattern}` : cid;
  md += `## ${label}\n\n`;
  md += `**Leader**\n\n${leader || '_(missing)_'}\n\n`;
  md += `**Team member**\n\n${team || '_(missing)_'}\n\n`;
  md += '---\n\n';
}

const orphanKept = orphans.filter((r) => String(r.keep || '').toLowerCase() === 'no');
if (orphanKept.length > 0) {
  md += '## Left out of the paired set (for awareness)\n\n';
  md +=
    'These items did not land in a clean leader+team pair during automated grouping; they were marked **not** activated as v2. ';
  md += 'You can ignore them unless you want to fold them into a future edit.\n\n';
  for (const r of orphanKept) {
    md += `- **${r.role}** (${r.pattern || '?'}): ${String(r.v1_source_text || '').slice(0, 200)}${String(r.v1_source_text || '').length > 200 ? '…' : ''}\n`;
  }
  md += '\n';
}

fs.writeFileSync(ARGS.out, md, 'utf8');
console.log('Wrote', ARGS.out, `(${pairs.length} paired constructs)`);
