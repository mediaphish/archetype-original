#!/usr/bin/env node
/**
 * ALI Instrument v2.0 Synthetic Pilot Test
 *
 * Runs offline assertions for:
 *   1. Narrative trigger engine — calm, dissonance, and systemic submissions.
 *   2. Paired Mirror math — per-construct, per-condition, overall.
 *   3. Privacy gate — N-threshold and small-tenant guardrails.
 *   4. Paired survey builder — selects 10 paired constructs with 3 anchors.
 *
 * No database, no network. Designed to run inside CI or before launch:
 *   node scripts/ali/synthetic-pilot-test.mjs
 *
 * Exit code is non-zero if any assertion fails.
 */

import {
  evaluateNarrativeTriggers,
  computePerConditionMeans,
} from '../../lib/ali-narrative-triggers.js';
import {
  aggregateByConstruct,
  calculateConstructMirrorGaps,
  calculateConditionMirror,
  calculateOverallMirror,
  calculatePairedDeploymentScores,
} from '../../lib/ali-paired-scoring.js';
import { evaluateExposureGate } from '../../lib/ali-narrative-privacy.js';
import { buildPairedSurvey } from '../../lib/ali-survey-builder.js';

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('  ok:', msg);
  } else {
    failed += 1;
    console.log('  FAIL:', msg);
  }
}

function approx(a, b, tol = 0.5) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= tol;
}

const PATTERNS = [
  'clarity',
  'consistency',
  'trust',
  'communication',
  'alignment',
  'stability',
  'leadership_drift',
];

function buildSyntheticBank() {
  const bank = {};
  for (const pattern of PATTERNS) {
    for (let i = 1; i <= 2; i += 1) {
      const cid = `C-${pattern.toUpperCase().replace(/_/g, '-')}-${String(i).padStart(2, '0')}`;
      bank[`Q2-${pattern.toUpperCase().replace(/_/g, '-')}-${i}-L`] = {
        construct_id: cid,
        pattern,
        is_negative: false,
        is_anchor: i === 1 && (pattern === 'clarity' || pattern === 'trust' || pattern === 'stability'),
        role: 'leader',
      };
      bank[`Q2-${pattern.toUpperCase().replace(/_/g, '-')}-${i}-T`] = {
        construct_id: cid,
        pattern,
        is_negative: false,
        is_anchor: i === 1 && (pattern === 'clarity' || pattern === 'trust' || pattern === 'stability'),
        role: 'team_member',
      };
    }
  }
  return bank;
}

function calmTeamResponse(bank) {
  const responses = {};
  for (const [stableId, meta] of Object.entries(bank)) {
    if (meta.role !== 'team_member') continue;
    responses[stableId] = 4;
  }
  return responses;
}

function dissonanceTeamResponse(bank, lowPattern) {
  const responses = {};
  for (const [stableId, meta] of Object.entries(bank)) {
    if (meta.role !== 'team_member') continue;
    responses[stableId] = meta.pattern === lowPattern ? 1 : 5;
  }
  return responses;
}

function systemicTeamResponse(bank, lowPatterns) {
  const responses = {};
  for (const [stableId, meta] of Object.entries(bank)) {
    if (meta.role !== 'team_member') continue;
    responses[stableId] = lowPatterns.includes(meta.pattern) ? 2 : 4;
  }
  return responses;
}

console.log('Trigger engine');
{
  const bank = buildSyntheticBank();

  const calmPrompt = evaluateNarrativeTriggers({
    responses: calmTeamResponse(bank),
    questionBank: bank,
    respondentRole: 'team_member',
  });
  ok(calmPrompt === null, 'calm submission produces no narrative prompt');

  const leaderPrompt = evaluateNarrativeTriggers({
    responses: dissonanceTeamResponse(bank, 'clarity'),
    questionBank: bank,
    respondentRole: 'leader',
  });
  ok(leaderPrompt === null, 'leader submissions never get a narrative prompt');

  const dissPrompt = evaluateNarrativeTriggers({
    responses: dissonanceTeamResponse(bank, 'clarity'),
    questionBank: bank,
    respondentRole: 'team_member',
  });
  ok(dissPrompt && dissPrompt.type === 'dissonance', 'dissonance submission triggers dissonance prompt');
  ok(dissPrompt?.condition === 'clarity', 'dissonance prompt names the condition (clarity)');

  const sysPrompt = evaluateNarrativeTriggers({
    responses: systemicTeamResponse(bank, ['clarity', 'trust', 'communication']),
    questionBank: bank,
    respondentRole: 'team_member',
  });
  ok(sysPrompt && sysPrompt.type === 'systemic', 'systemic submission triggers systemic prompt');

  const personalMeans = computePerConditionMeans(calmTeamResponse(bank), bank);
  ok(personalMeans.clarity?.mean === 4, 'computePerConditionMeans returns simple Likert mean');
}

console.log('\nPaired Mirror math');
{
  const bank = buildSyntheticBank();

  const transformed = [];
  for (const [stableId, meta] of Object.entries(bank)) {
    if (meta.pattern !== 'clarity') continue;
    if (meta.role === 'leader') {
      transformed.push({ question_id: stableId, response: 5, role: 'leader', is_negative: false, is_anchor: meta.is_anchor, pattern: meta.pattern });
    } else {
      transformed.push({ question_id: stableId, response: 2, role: 'team_member', is_negative: false, is_anchor: meta.is_anchor, pattern: meta.pattern });
      transformed.push({ question_id: stableId, response: 3, role: 'team_member', is_negative: false, is_anchor: meta.is_anchor, pattern: meta.pattern });
    }
  }

  const aggregates = aggregateByConstruct(transformed, bank);
  const constructGaps = calculateConstructMirrorGaps(aggregates);
  ok(constructGaps.length >= 2, 'two clarity constructs aggregated');
  for (const c of constructGaps) {
    ok(approx(c.leader_score, 100, 0.001), `${c.construct_id} leader 5/5 -> 100`);
    ok(approx(c.team_score, ((((2 + 3) / 2) - 1) / 4) * 100, 0.5), `${c.construct_id} team mean (2,3) -> 37.5`);
    ok(typeof c.mirror_gap === 'number' && c.mirror_gap > 0, `${c.construct_id} positive gap (leader > team)`);
  }

  const conditionMirror = calculateConditionMirror(aggregates);
  ok(conditionMirror.clarity.construct_count === 2, 'condition mirror counts both clarity constructs');
  ok(approx(conditionMirror.clarity.leader_score, 100, 0.001), 'condition leader = 100');
  ok(approx(conditionMirror.clarity.team_score, 37.5, 0.5), 'condition team ~ 37.5');
  ok(approx(conditionMirror.clarity.mirror_gap, 62.5, 0.5), 'condition mirror gap ~ 62.5');

  const overall = calculateOverallMirror(constructGaps);
  ok(approx(overall.mirror_gap, 62.5, 0.5), 'overall mirror gap ~ 62.5');

  const paired = calculatePairedDeploymentScores(transformed, bank);
  ok(paired.constructs.length === constructGaps.length, 'calculatePairedDeploymentScores convenience matches');
}

console.log('\nPrivacy gate');
{
  const small = evaluateExposureGate({ approvedCount: 5, respondentCount: 5 });
  ok(small.allowed === false && small.reason === 'small_tenant_guardrail', 'small tenant blocks exposure');

  const lowN = evaluateExposureGate({ approvedCount: 1, respondentCount: 20 });
  ok(lowN.allowed === false && lowN.reason === 'n_threshold_not_met', 'N-threshold blocks exposure');

  const ok1 = evaluateExposureGate({ approvedCount: 3, respondentCount: 12 });
  ok(ok1.allowed === true && ok1.reason === 'thresholds_met', 'thresholds met allows exposure');
}

console.log('\nPaired survey builder');
{
  const bankRows = [];
  let bankIdx = 0;
  for (const pattern of PATTERNS) {
    for (let i = 1; i <= 3; i += 1) {
      const cid = `C-${pattern.toUpperCase().replace(/_/g, '-')}-${String(i).padStart(2, '0')}`;
      const isAnchor = i === 1 && (pattern === 'clarity' || pattern === 'trust' || pattern === 'stability');
      bankRows.push({
        stable_id: `Q2-${pattern.toUpperCase().replace(/_/g, '-')}-${i}-L-${bankIdx++}`,
        question_text: `${pattern} leader ${i}`,
        pattern,
        role: 'leader',
        is_anchor: isAnchor,
        is_negative: i === 2,
        construct_id: cid,
        response_scale: '1_5_likert',
        status: 'active',
        instrument_version: 'v2.0',
      });
      bankRows.push({
        stable_id: `Q2-${pattern.toUpperCase().replace(/_/g, '-')}-${i}-T-${bankIdx++}`,
        question_text: `${pattern} team ${i}`,
        pattern,
        role: 'team_member',
        is_anchor: isAnchor,
        is_negative: i === 2,
        construct_id: cid,
        response_scale: '1_5_likert',
        status: 'active',
        instrument_version: 'v2.0',
      });
    }
  }

  const built = buildPairedSurvey(bankRows, 'tenant-test', 'S1', 'v2.0');
  ok(built.constructs.length === 10, 'paired survey has 10 constructs');
  ok(built.validation.composition.anchorCount === 3, '3 anchors selected');
  ok(built.validation.composition.patternCount === 7, 'all 7 patterns covered (excluding anchors)');

  const same = buildPairedSurvey(bankRows, 'tenant-test', 'S1', 'v2.0');
  const idsA = built.constructs.map((c) => c.construct_id).join(',');
  const idsB = same.constructs.map((c) => c.construct_id).join(',');
  ok(idsA === idsB, 'paired survey selection is deterministic per (tenant, surveyIndex, version)');
}

console.log('');
console.log(`Synthetic pilot test complete. passed=${passed} failed=${failed}`);
if (failed > 0) process.exit(1);
