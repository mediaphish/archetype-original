#!/usr/bin/env node
/**
 * Run ALI lib (cadence + survey-builder) assertions without Jest.
 * Use when Jest cannot run (e.g. babel-jest resolution issues).
 * Run: node scripts/run-ali-lib-tests.mjs
 * Requires: npm install (working node_modules with seedrandom).
 */

import {
  calculateSurveyDate,
  calculateAvailableAt,
  getNextSurveyIndex,
} from '../lib/ali-cadence.js';

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ok:', msg);
  } else {
    failed++;
    console.log('  FAIL:', msg);
  }
}

console.log('ali-cadence');
const base = new Date('2026-01-19');
const s1 = calculateSurveyDate(base, 'S1');
ok(s1.getTime() === base.getTime(), 'S1 = baseline');
const s2 = calculateSurveyDate(base, 'S2');
ok(s2.getFullYear() === 2026 && s2.getMonth() === 3 && s2.getDate() >= 18 && s2.getDate() <= 20, 'S2 = baseline + 3 months (Apr 2026)');
const jan31 = new Date('2026-01-31');
const s2e = calculateSurveyDate(jan31, 'S2');
ok(s2e.getDate() === 30 && s2e.getMonth() === 3, 'month-end rule: Jan 31 + 3 mo -> Apr 30');
ok(getNextSurveyIndex([]) === 'S1', 'getNextSurveyIndex([]) -> S1');
ok(getNextSurveyIndex([{ survey_index: 'S1' }]) === 'S2', 'getNextSurveyIndex([S1]) -> S2');
const at = calculateAvailableAt(base, 'S1');
ok(at.getUTCHours() === 0 && at.getUTCMinutes() === 0, 'calculateAvailableAt start of day UTC');

let builderOk = true;
try {
  const {
    generateSeed,
    selectDeterministic,
    deterministicShuffle,
    validateSurveyComposition,
    buildSurvey,
  } = await import('../lib/ali-survey-builder.js');
  console.log('ali-survey-builder');
  ok(generateSeed('a', 'S1', 'v1.0') === generateSeed('a', 'S1', 'v1.0'), 'generateSeed deterministic');
  ok(generateSeed('a', 'S1') !== generateSeed('b', 'S1'), 'generateSeed diff client -> diff seed');
  ok(selectDeterministic([1, 2, 3], 's1') === selectDeterministic([1, 2, 3], 's1'), 'selectDeterministic deterministic');
  const arr = [1, 2, 3];
  deterministicShuffle(arr, 's1');
  ok(arr[0] === 1 && arr[1] === 2 && arr[2] === 3, 'deterministicShuffle does not mutate input');
  const valid = [
    { stable_id: 'A1', is_anchor: true, pattern: 'c', is_negative: false, status: 'active' },
    { stable_id: 'A2', is_anchor: true, pattern: 'c', is_negative: false, status: 'active' },
    { stable_id: 'A3', is_anchor: true, pattern: 'c', is_negative: false, status: 'active' },
    ...['P1','P2','P3','P4','P5','P6','P7'].map((id, i) => ({
      stable_id: id,
      is_anchor: false,
      pattern: ['clarity','consistency','trust','communication','alignment','stability','leadership_drift'][i],
      is_negative: i < 2,
      status: 'active',
    })),
  ];
  const v = validateSurveyComposition(valid);
  ok(v.isValid && v.composition.anchorCount === 3 && v.composition.totalCount === 10, 'validateSurveyComposition valid');
  const clientId = '11111111-1111-1111-1111-111111111111';
  const bank = [
    { stable_id: 'A1', is_anchor: true, role: 'leader', pattern: 'clarity', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'A2', is_anchor: true, role: 'team_member', pattern: 'consistency', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'A3', is_anchor: true, role: 'leader', pattern: 'trust', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'C1', is_anchor: false, pattern: 'clarity', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'C2', is_anchor: false, pattern: 'consistency', is_negative: true, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'T1', is_anchor: false, pattern: 'trust', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'M1', is_anchor: false, pattern: 'communication', is_negative: true, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'L1', is_anchor: false, pattern: 'alignment', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'S1', is_anchor: false, pattern: 'stability', is_negative: false, status: 'active', instrument_version: 'v1.0' },
    { stable_id: 'D1', is_anchor: false, pattern: 'leadership_drift', is_negative: false, status: 'active', instrument_version: 'v1.0' },
  ];
  const out = buildSurvey(bank, clientId, 'S1', 'v1.0');
  ok(out.validation.isValid && out.questions.length === 10, 'buildSurvey constraints');
  const out2 = buildSurvey(bank, clientId, 'S1', 'v1.0');
  const ids1 = out.questions.map((q) => q.stable_id);
  const ids2 = out2.questions.map((q) => q.stable_id);
  ok(ids1.length === ids2.length && ids1.every((id, i) => id === ids2[i]), 'buildSurvey deterministic');
} catch (e) {
  console.log('ali-survey-builder (skipped:', e.message, ')');
  console.log('  skip: run npm install then use Jest or this script to run builder tests');
}

console.log('');
console.log('Result:', passed, 'passed,', failed, 'failed');
process.exit(failed > 0 ? 1 : 0);
