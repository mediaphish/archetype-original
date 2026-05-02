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

for (const r of rows) {
  const keep = String(r.keep || '').toLowerCase();
  if (keep !== 'yes') continue;
  const cid = String(r.construct_id || '').trim();
  if (!cid) continue;
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
md += '# ALI v2 — Paired questions\n\n';
md += `**Constructs:** ${pairs.length}\n\n`;
md += '---\n\n';

for (const [cid, { pattern, leader, team }] of pairs) {
  const label = pattern ? `${cid} · ${pattern}` : cid;
  md += `## ${label}\n\n`;
  md += `Leader:\n\n${leader || '_(missing)_'}\n\n`;
  md += `Team member:\n\n${team || '_(missing)_'}\n\n`;
  md += '---\n\n';
}

fs.writeFileSync(ARGS.out, md, 'utf8');
console.log('Wrote', ARGS.out, `(${pairs.length} paired constructs)`);
