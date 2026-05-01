#!/usr/bin/env node
/**
 * ALI Instrument v2.0 Curation Tool
 *
 * Triages the existing v1.x question bank into v2.0 paired items
 * (leader stem + team_member stem per construct), without deleting anything.
 *
 * Modes:
 *   --plan      (default) Read v1.x active items, propose construct groupings,
 *               and emit a CSV worksheet for human review.
 *   --apply     Read an approved CSV worksheet and write v2.0 rows back to the
 *               question bank with lineage_source_ids, then deprecate the
 *               corresponding v1.x items with a reason.
 *   --verify    Run the v2.0 paired-coverage view + unpaired check and print
 *               a launch-readiness summary.
 *
 * Usage:
 *   node scripts/ali/curate-instrument.mjs --plan --out notes/ali-instrument-v2-curation.csv
 *   node scripts/ali/curate-instrument.mjs --apply --in notes/ali-instrument-v2-curation.approved.csv
 *   node scripts/ali/curate-instrument.mjs --verify
 *
 * Notes:
 *   - --apply requires explicit human approval. The script refuses to run
 *     unless --confirm is passed.
 *   - --apply is idempotent: re-running with the same CSV is safe; rows that
 *     already exist are skipped.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { loadAliEnv } from './load-env.mjs';

loadAliEnv();

const ARGS = parseArgs(process.argv.slice(2));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PATTERNS = [
  'clarity',
  'consistency',
  'trust',
  'communication',
  'alignment',
  'stability',
  'leadership_drift',
];

main().catch((err) => {
  console.error('Curation tool failed:', err);
  process.exit(1);
});

async function main() {
  const mode = ARGS.mode || 'plan';

  if (mode === 'plan') return planMode();
  if (mode === 'apply') return applyMode();
  if (mode === 'verify') return verifyMode();

  console.error(`Unknown mode: ${mode}`);
  process.exit(2);
}

// ----------------------------------------------------------------
// PLAN MODE — produce a CSV worksheet for human review
// ----------------------------------------------------------------

async function planMode() {
  const out = ARGS.out || 'notes/ali-instrument-v2-curation.csv';

  const { data: items, error } = await supabase
    .from('ali_question_bank')
    .select('*')
    .eq('status', 'active')
    .order('pattern')
    .order('role')
    .order('stable_id');

  if (error) throw error;
  if (!items || items.length === 0) {
    console.log('Question bank has no active items to curate.');
    const { data: depRows, error: depErr } = await supabase
      .from('ali_question_bank')
      .select('instrument_version')
      .eq('status', 'deprecated');
    if (!depErr && Array.isArray(depRows)) {
      const v1Deprecated = depRows.filter(
        (r) => r.instrument_version === 'v1.0' || String(r.instrument_version || '').startsWith('v1.')
      ).length;
      if (v1Deprecated > 0) {
        console.log(
          `Hint: ${v1Deprecated} deprecated v1.x row(s) exist. If cutover ran before v2 was inserted, run database/ALI_V1_TEMP_REACTIVATE_FOR_V2_CURATION.sql in Supabase, then re-run --plan.`
        );
      }
    }
    return;
  }

  const v1x = items.filter((q) => isV1(q.instrument_version));
  const proposals = proposeConstructs(v1x);

  const rows = [];
  for (const p of proposals) {
    const leaderText = p.leaderItem ? p.leaderItem.question_text : '';
    const teamText = p.teamItem ? p.teamItem.question_text : '';

    rows.push({
      construct_id: p.construct_id,
      pattern: p.pattern,
      role: 'leader',
      proposed_action: p.leaderItem ? 'preserved' : 'new',
      v1_source_stable_id: p.leaderItem?.stable_id || '',
      v1_source_text: p.leaderItem?.question_text || '',
      v2_question_text: leaderText,
      angle: p.leaderItem?.angle || '',
      lens: p.leaderItem?.lens || '',
      is_negative: p.leaderItem?.is_negative ? 'true' : 'false',
      is_anchor: p.leaderItem?.is_anchor ? 'true' : 'false',
      response_scale: '1_5_likert',
      equivalence_note: p.equivalence_note,
      reviewer_notes: '',
      keep: 'yes',
    });

    rows.push({
      construct_id: p.construct_id,
      pattern: p.pattern,
      role: 'team_member',
      proposed_action: p.teamItem ? 'preserved' : 'new',
      v1_source_stable_id: p.teamItem?.stable_id || '',
      v1_source_text: p.teamItem?.question_text || '',
      v2_question_text: teamText,
      angle: p.teamItem?.angle || '',
      lens: p.teamItem?.lens || '',
      is_negative: p.teamItem?.is_negative ? 'true' : 'false',
      is_anchor: p.teamItem?.is_anchor ? 'true' : 'false',
      response_scale: '1_5_likert',
      equivalence_note: p.equivalence_note,
      reviewer_notes: '',
      keep: 'yes',
    });
  }

  const orphans = findOrphans(v1x, proposals);
  for (const o of orphans) {
    rows.push({
      construct_id: '',
      pattern: o.pattern,
      role: o.role,
      proposed_action: 'retire',
      v1_source_stable_id: o.stable_id,
      v1_source_text: o.question_text,
      v2_question_text: '',
      angle: o.angle || '',
      lens: o.lens || '',
      is_negative: o.is_negative ? 'true' : 'false',
      is_anchor: o.is_anchor ? 'true' : 'false',
      response_scale: '1_5_likert',
      equivalence_note: '',
      reviewer_notes: 'Unpaired in v1.x; reviewer to assign construct or confirm retire.',
      keep: 'no',
    });
  }

  ensureDir(path.dirname(out));
  fs.writeFileSync(out, toCsv(rows), 'utf8');

  console.log(`Curation plan written: ${out}`);
  console.log(`  Proposed constructs: ${proposals.length}`);
  console.log(`  Total rows (one per role per construct + orphans): ${rows.length}`);
  console.log('');
  console.log('Next steps (manual):');
  console.log('  1. Open the CSV in a spreadsheet, edit v2_question_text for any role-voiced rewrites,');
  console.log('     adjust proposed_action to preserved | edited | rewritten | new | retire,');
  console.log('     and set keep=yes for everything you want activated in v2.0.');
  console.log('  2. Save the approved file as notes/ali-instrument-v2-curation.approved.csv.');
  console.log('  3. Run: node scripts/ali/curate-instrument.mjs --apply --in <approved.csv> --confirm');
}

// ----------------------------------------------------------------
// APPLY MODE — write v2.0 rows and deprecate v1.x
// ----------------------------------------------------------------

async function applyMode() {
  if (!ARGS.confirm) {
    console.error('Refusing to apply without --confirm. This writes to the question bank.');
    process.exit(2);
  }

  const inPath = ARGS.in;
  if (!inPath) {
    console.error('--apply requires --in <approved csv>');
    process.exit(2);
  }
  if (!fs.existsSync(inPath)) {
    console.error(`Input CSV not found: ${inPath}`);
    process.exit(2);
  }

  const rows = fromCsv(fs.readFileSync(inPath, 'utf8')).filter(
    (r) => r.keep && r.keep.toLowerCase() === 'yes'
  );

  if (rows.length === 0) {
    console.log('No rows marked keep=yes. Nothing to apply.');
    return;
  }

  const constructGroups = new Map();
  for (const r of rows) {
    if (!r.construct_id || r.proposed_action === 'retire') continue;
    if (!constructGroups.has(r.construct_id)) constructGroups.set(r.construct_id, []);
    constructGroups.get(r.construct_id).push(r);
  }

  const issues = [];
  for (const [cid, items] of constructGroups.entries()) {
    const roles = new Set(items.map((i) => i.role));
    if (!roles.has('leader') || !roles.has('team_member')) {
      issues.push(`Construct ${cid} is missing a role pair (have: ${[...roles].join(', ')}).`);
    }
    const scales = new Set(items.map((i) => (i.response_scale || '1_5_likert').trim()));
    if (scales.size > 1) {
      issues.push(`Construct ${cid} has mismatched response_scale values: ${[...scales].join(', ')}`);
    }
  }
  if (issues.length > 0) {
    console.error('Cannot apply — paired/scale issues:');
    issues.forEach((i) => console.error('  - ' + i));
    process.exit(2);
  }

  const sourceIds = new Set();
  let inserted = 0;
  let skipped = 0;

  for (const [cid, items] of constructGroups.entries()) {
    const equivalenceNote = (items.find((i) => i.equivalence_note)?.equivalence_note || '').trim();

    for (const item of items) {
      const v1Source = (item.v1_source_stable_id || '').trim();
      if (v1Source) sourceIds.add(v1Source);

      const newStableId = makeV2StableId(cid, item.role);

      const { data: existing } = await supabase
        .from('ali_question_bank')
        .select('stable_id, status, instrument_version')
        .eq('stable_id', newStableId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const insertRow = {
        stable_id: newStableId,
        question_text: (item.v2_question_text || '').trim(),
        pattern: (item.pattern || '').trim(),
        role: item.role,
        angle: (item.angle || 'experience').trim(),
        lens: (item.lens || 'behavioral_alignment').trim(),
        is_negative: parseBool(item.is_negative),
        is_anchor: parseBool(item.is_anchor),
        instrument_version: 'v2.0',
        status: 'active',
        construct_id: cid,
        equivalence_note: equivalenceNote || null,
        lineage_source_ids: v1Source ? [v1Source] : [],
        lineage_action: normalizeAction(item.proposed_action),
        response_scale: (item.response_scale || '1_5_likert').trim(),
        created_by: 'curate-instrument',
      };

      if (!insertRow.question_text) {
        console.error(`Skipping ${newStableId}: empty v2_question_text.`);
        continue;
      }

      const { error } = await supabase.from('ali_question_bank').insert(insertRow);
      if (error) {
        if (error.code === '23505') {
          skipped++;
          continue;
        }
        throw error;
      }
      inserted++;
    }
  }

  let deprecated = 0;
  for (const sid of sourceIds) {
    const { data: existing } = await supabase
      .from('ali_question_bank')
      .select('stable_id, status, instrument_version')
      .eq('stable_id', sid)
      .maybeSingle();
    if (!existing) continue;
    if (existing.status !== 'active') continue;
    if (!isV1(existing.instrument_version)) continue;

    const { error } = await supabase
      .from('ali_question_bank')
      .update({
        status: 'deprecated',
        deprecated_reason: 'replaced in instrument v2.0; lineage preserved',
      })
      .eq('stable_id', sid);
    if (error) throw error;
    deprecated++;
  }

  console.log('Curation apply complete.');
  console.log(`  v2.0 items inserted: ${inserted}`);
  console.log(`  v2.0 items already present (skipped): ${skipped}`);
  console.log(`  v1.x items deprecated with lineage reason: ${deprecated}`);
}

// ----------------------------------------------------------------
// VERIFY MODE — run the SQL views to confirm paired coverage
// ----------------------------------------------------------------

async function verifyMode() {
  const { data: coverage, error } = await supabase
    .from('ali_v2_construct_coverage')
    .select('*');
  if (error) throw error;

  const { data: unpaired, error: e2 } = await supabase.rpc('ali_v2_unpaired_constructs');
  if (e2) throw e2;

  const constructCount = (coverage || []).length;
  const pairedCount = (coverage || []).filter((c) => c.is_paired && c.scales_match).length;

  console.log(`v2.0 constructs: ${constructCount}`);
  console.log(`Fully paired and scale-matched: ${pairedCount}`);
  if (unpaired && unpaired.length > 0) {
    console.log('Issues:');
    unpaired.forEach((u) => {
      console.log(`  - ${u.construct_id}: ${u.reason} (leader=${u.leader_item_count}, team=${u.team_item_count})`);
    });
    process.exitCode = 1;
  } else {
    console.log('All active v2.0 constructs are paired with matching scales.');
  }
}

// ----------------------------------------------------------------
// Construct proposal heuristic
// ----------------------------------------------------------------

function proposeConstructs(items) {
  const proposals = [];
  for (const pattern of PATTERNS) {
    const leaderItems = items.filter((q) => q.pattern === pattern && q.role === 'leader');
    const teamItems = items.filter((q) => q.pattern === pattern && q.role === 'team_member');

    const used = new Set();
    let idx = 1;

    for (const leader of leaderItems) {
      const team = pickTeamMatch(leader, teamItems, used);
      if (!team) continue;
      used.add(team.stable_id);

      const construct_id = makeConstructId(pattern, idx);
      idx++;

      proposals.push({
        construct_id,
        pattern,
        leaderItem: leader,
        teamItem: team,
        equivalence_note:
          'Leader speaks from agency; team-member speaks from received experience. Both rate the same observable behavior on a 1–5 Likert scale.',
      });
    }
  }
  return proposals;
}

function pickTeamMatch(leader, teamItems, used) {
  const candidates = teamItems.filter(
    (q) =>
      !used.has(q.stable_id) &&
      q.lens === leader.lens &&
      q.is_negative === leader.is_negative &&
      q.is_anchor === leader.is_anchor
  );
  if (candidates.length > 0) return candidates[0];

  const looseCandidates = teamItems.filter(
    (q) => !used.has(q.stable_id) && q.is_anchor === leader.is_anchor
  );
  return looseCandidates[0] || null;
}

function findOrphans(items, proposals) {
  const usedIds = new Set();
  for (const p of proposals) {
    if (p.leaderItem) usedIds.add(p.leaderItem.stable_id);
    if (p.teamItem) usedIds.add(p.teamItem.stable_id);
  }
  return items.filter((q) => !usedIds.has(q.stable_id));
}

function makeConstructId(pattern, idx) {
  const slug = pattern.toUpperCase().replace(/_/g, '-');
  return `C-${slug}-${String(idx).padStart(2, '0')}`;
}

function makeV2StableId(constructId, role) {
  const roleTag = role === 'leader' ? 'L' : 'T';
  return `Q2-${constructId.replace(/^C-/, '')}-${roleTag}`;
}

function isV1(version) {
  if (!version) return false;
  return version === 'v1.0' || version.startsWith('v1.');
}

function parseBool(value) {
  if (value === true || value === false) return value;
  const v = String(value || '').trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === '1';
}

function normalizeAction(action) {
  const a = String(action || '').trim().toLowerCase();
  if (['preserved', 'edited', 'rewritten', 'new'].includes(a)) return a;
  return 'edited';
}

// ----------------------------------------------------------------
// Argument parsing and CSV helpers
// ----------------------------------------------------------------

function parseArgs(argv) {
  const out = { mode: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plan') out.mode = 'plan';
    else if (a === '--apply') out.mode = 'apply';
    else if (a === '--verify') out.mode = 'verify';
    else if (a === '--confirm') out.confirm = true;
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--in') out.in = argv[++i];
  }
  return out;
}

function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = val == null ? '' : String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
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
