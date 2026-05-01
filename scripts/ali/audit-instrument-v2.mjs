#!/usr/bin/env node
/**
 * ALI Instrument v2.0 Light Validation Audit
 *
 * Runs three checks against the active v2.0 question bank:
 *   1. Readability: Flesch-Kincaid grade level per question (target 8–10).
 *   2. Response-scale uniformity: every active v2.0 construct must use one scale.
 *   3. Paired coverage: every active v2.0 construct has leader + team_member stems.
 *
 * Output is written as a Markdown summary so it can be saved alongside the
 * say-back read-through note in notes/ali-instrument-v2-validation.md.
 *
 * Usage:
 *   node scripts/ali/audit-instrument-v2.mjs
 *   node scripts/ali/audit-instrument-v2.mjs --out notes/ali-instrument-v2-validation-audit.md
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { loadAliEnv } from './load-env.mjs';

loadAliEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(2);
}

const ARGS = parseArgs(process.argv.slice(2));
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

async function main() {
  const { data: items, error } = await supabase
    .from('ali_question_bank')
    .select('stable_id, question_text, role, pattern, construct_id, response_scale, instrument_version, status')
    .eq('status', 'active')
    .eq('instrument_version', 'v2.0')
    .order('construct_id')
    .order('role');

  if (error) throw error;

  if (!items || items.length === 0) {
    console.log('No active v2.0 items in ali_question_bank yet. Run --apply on the curation tool first.');
    return;
  }

  const readability = items.map((q) => ({
    stable_id: q.stable_id,
    construct_id: q.construct_id,
    role: q.role,
    grade: fleschKincaidGrade(q.question_text),
    text: q.question_text,
  }));
  const offGrade = readability.filter((r) => r.grade !== null && (r.grade < 6 || r.grade > 12));

  const byConstruct = new Map();
  for (const q of items) {
    if (!byConstruct.has(q.construct_id)) byConstruct.set(q.construct_id, []);
    byConstruct.get(q.construct_id).push(q);
  }

  const scaleIssues = [];
  const pairingIssues = [];
  for (const [cid, group] of byConstruct.entries()) {
    const scales = new Set(group.map((g) => g.response_scale));
    if (scales.size > 1) {
      scaleIssues.push({ construct_id: cid, scales: [...scales] });
    }
    const roles = new Set(group.map((g) => g.role));
    if (!roles.has('leader') || !roles.has('team_member')) {
      pairingIssues.push({ construct_id: cid, roles: [...roles] });
    }
  }

  const summary = renderMarkdown({
    items,
    readability,
    offGrade,
    scaleIssues,
    pairingIssues,
    constructCount: byConstruct.size,
  });

  const outPath = ARGS.out;
  if (outPath) {
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, summary, 'utf8');
    console.log(`Audit written: ${outPath}`);
  } else {
    process.stdout.write(summary);
  }

  if (offGrade.length > 0 || scaleIssues.length > 0 || pairingIssues.length > 0) {
    process.exitCode = 1;
  }
}

function renderMarkdown({ items, readability, offGrade, scaleIssues, pairingIssues, constructCount }) {
  const lines = [];
  lines.push('# ALI Instrument v2.0 Audit (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- Active v2.0 items: ${items.length}`);
  lines.push(`- Active v2.0 constructs: ${constructCount}`);
  lines.push(`- Readability concerns (grade outside 6–12): ${offGrade.length}`);
  lines.push(`- Response-scale mismatches inside a construct: ${scaleIssues.length}`);
  lines.push(`- Constructs missing a role pair: ${pairingIssues.length}`);
  lines.push('');

  lines.push('## Readability detail (target Flesch-Kincaid grade 8–10)');
  lines.push('');
  lines.push('| construct_id | role | grade | stable_id |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of readability) {
    const g = r.grade === null ? 'n/a' : r.grade.toFixed(1);
    lines.push(`| ${r.construct_id || ''} | ${r.role} | ${g} | ${r.stable_id} |`);
  }
  lines.push('');

  if (offGrade.length > 0) {
    lines.push('### Items outside the comfort range');
    lines.push('');
    for (const r of offGrade) {
      lines.push(`- \`${r.stable_id}\` (${r.role}, grade ${r.grade?.toFixed(1)}): ${r.text}`);
    }
    lines.push('');
  }

  if (scaleIssues.length > 0) {
    lines.push('## Response-scale mismatches');
    lines.push('');
    for (const s of scaleIssues) {
      lines.push(`- \`${s.construct_id}\`: ${s.scales.join(', ')}`);
    }
    lines.push('');
  }

  if (pairingIssues.length > 0) {
    lines.push('## Pairing issues');
    lines.push('');
    for (const p of pairingIssues) {
      lines.push(`- \`${p.construct_id}\`: roles present = ${p.roles.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function fleschKincaidGrade(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;

  const sentences = Math.max(1, (cleaned.match(/[.!?]+/g) || []).length);
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return null;

  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);

  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;

  let stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  stripped = stripped.replace(/^y/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = argv[++i];
  }
  return out;
}

function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
