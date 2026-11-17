/**
 * ALI v3: bank, builder, scoring, privacy gate, submission checks.
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';

import { CONDITION_KEYS, RESULT_KEYS } from '../ali-conditions.js';
import { V3_CORE_IDEAS, V3_TRIAL_IDEAS, V3_VERSIONS, listV3Items, validateV3Bank } from '../ali-v3-bank.js';
import { buildV3Round, versionFor, trialIdeaFor, questionsForRole } from '../ali-v3-survey.js';
import {
  itemScore,
  scoreV3Round,
  computeDrift,
  mirrorDirection,
  confidenceFor,
  detectPatterns,
  MIRROR_AGREEMENT_BAND,
} from '../ali-v3-scoring.js';
import { gateRoundResults, teamResultsAllowed, MIN_TEAM_RESPONSES } from '../ali-v3-privacy.js';
import { validateV3Answers, isValidSubmissionId, submissionKeyHash, createRateLimiter } from '../ali-v3-submission.js';
import { nextRoundNumberFrom, roundStatus } from '../ali-v3-survey.js';
import { buildSeedSql } from '../ali-v3-seed.js';

const ROOT = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
describe('v3 conditions', () => {
  it('seven conditions in the approved order, two results', () => {
    expect(CONDITION_KEYS).toEqual(['clarity', 'consistency', 'accountability', 'voice', 'growth', 'support', 'alignment']);
    expect(RESULT_KEYS).toEqual(['trust', 'commitment']);
  });
});

// ---------------------------------------------------------------------------
describe('v3 bank', () => {
  it('passes the machine-checkable question rules', () => {
    expect(validateV3Bank()).toEqual([]);
  });

  it('has 17 core ideas and 2 trial ideas per condition', () => {
    expect(V3_CORE_IDEAS).toHaveLength(17);
    for (const c of CONDITION_KEYS) {
      expect(V3_TRIAL_IDEAS.filter((i) => i.condition === c)).toHaveLength(2);
    }
    expect(V3_TRIAL_IDEAS.every((i) => i.trial)).toBe(true);
    expect(V3_CORE_IDEAS.every((i) => !i.trial)).toBe(true);
  });

  it('core wording matches notes/ali-conditions-v3.md word for word', () => {
    const md = fs.readFileSync(path.join(ROOT, 'notes', 'ali-conditions-v3.md'), 'utf8');
    const section = md.split('### Approved questions')[1].split('## Survey shape')[0];
    const lines = section.split('\n').filter((l) => /^- [A-D]( \(reversed\))?\. Team: /.test(l));
    expect(lines).toHaveLength(68);
    const fromNotes = lines.map((l) => {
      const m = l.match(/^- ([A-D])( \(reversed\))?\. Team: (.*) \/ Leader: (.*)$/);
      const leader = m[4].replace(/\s*\([^()]*\)\s*$/, '');
      return { version: m[1], reversed: !!m[2], team: m[3], leader };
    });
    const fromBank = V3_CORE_IDEAS.flatMap((i) =>
      V3_VERSIONS.map((v) => ({ version: v, reversed: i.versions[v].reversed, team: i.versions[v].team, leader: i.versions[v].leader }))
    );
    expect(fromBank).toEqual(fromNotes);
  });

  it('trial wording has no long dashes and every trial idea has one reversed version', () => {
    for (const i of V3_TRIAL_IDEAS) {
      expect(V3_VERSIONS.filter((v) => i.versions[v].reversed)).toHaveLength(1);
      for (const v of V3_VERSIONS) {
        expect(i.versions[v].team).not.toMatch(/[—–]/);
        expect(i.versions[v].leader).not.toMatch(/[—–]/);
      }
    }
  });

  it('stable ids are unique', () => {
    const ids = listV3Items().map((i) => i.stable_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the SQL seed file is current with the bank', () => {
    const onDisk = fs.readFileSync(path.join(ROOT, 'database', 'ALI_V3_BANK_SEED.sql'), 'utf8');
    expect(onDisk).toBe(buildSeedSql());
  });
});

// ---------------------------------------------------------------------------
describe('v3 builder', () => {
  const company = '11111111-2222-3333-4444-555555555555';

  it('is deterministic for the same company and round', () => {
    expect(buildV3Round(company, 3)).toEqual(buildV3Round(company, 3));
  });

  it('has all 17 core ideas once plus exactly one trial idea', () => {
    const { items } = buildV3Round(company, 1);
    expect(items).toHaveLength(18);
    const core = items.filter((i) => !i.is_trial);
    expect(new Set(core.map((i) => i.idea_id)).size).toBe(17);
    expect(items.filter((i) => i.is_trial)).toHaveLength(1);
    expect(items.map((i) => i.order)).toEqual(Array.from({ length: 18 }, (_, k) => k + 1));
  });

  it('never repeats the version of an idea in consecutive rounds', () => {
    for (let r = 1; r < 9; r++) {
      const a = Object.fromEntries(buildV3Round(company, r).items.map((i) => [i.idea_id, i.version]));
      const b = Object.fromEntries(buildV3Round(company, r + 1).items.map((i) => [i.idea_id, i.version]));
      for (const idea of V3_CORE_IDEAS) expect(a[idea.id]).not.toBe(b[idea.id]);
    }
  });

  it('cycles through all four versions over four rounds', () => {
    for (const idea of V3_CORE_IDEAS) {
      const seen = new Set([1, 2, 3, 4].map((r) => versionFor(company, idea.id, r)));
      expect(seen.size).toBe(4);
    }
  });

  it('rotates through the whole trial pool before repeating', () => {
    const seen = new Set();
    for (let r = 1; r <= V3_TRIAL_IDEAS.length; r++) seen.add(trialIdeaFor(company, r).id);
    expect(seen.size).toBe(V3_TRIAL_IDEAS.length);
  });

  it('shuffles order between rounds and between companies', () => {
    const o1 = buildV3Round(company, 1).items.map((i) => i.idea_id).join();
    const o2 = buildV3Round(company, 2).items.map((i) => i.idea_id).join();
    const o3 = buildV3Round('another-company', 1).items.map((i) => i.idea_id).join();
    expect(o1).not.toBe(o2);
    expect(o1).not.toBe(o3);
  });

  it('gives leader and team the same items in the same order', () => {
    const { items } = buildV3Round(company, 2);
    const t = questionsForRole(items, 'team_member');
    const l = questionsForRole(items, 'leader');
    expect(t.map((q) => q.id)).toEqual(l.map((q) => q.id));
    expect(t[0].text).toBe(items.find((i) => i.order === 1).team_text);
    expect(l[0].text).toBe(items.find((i) => i.order === 1).leader_text);
  });

  it('fails loudly when the bank cannot build a survey', () => {
    expect(() => buildV3Round(company, 1, { coreIdeas: V3_CORE_IDEAS.slice(0, 10) })).toThrow(/cannot build a survey/);
    expect(() => buildV3Round(company, 1, { trialIdeas: [] })).toThrow(/cannot build a survey/);
    expect(() => buildV3Round('', 1)).toThrow();
    expect(() => buildV3Round(company, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Helpers for scoring tests: answer every item the same "agreement" level,
// so reversed items get the mirror answer and every idea lands on the same score.
function answersAt(items, level, overrides = {}) {
  const out = {};
  for (const it of items) {
    if (it.is_trial) continue;
    const lvl = overrides[it.condition] ?? level;
    out[it.stable_id] = it.is_reversed ? 6 - lvl : lvl;
  }
  return out;
}

describe('v3 scoring', () => {
  const { items } = buildV3Round('score-co', 1);

  it('reverse-scores reversed items and maps 1..5 to 0..100', () => {
    expect(itemScore(5, false)).toBe(100);
    expect(itemScore(1, false)).toBe(0);
    expect(itemScore(3, false)).toBe(50);
    expect(itemScore(5, true)).toBe(0);
    expect(itemScore(2, true)).toBe(75);
    expect(itemScore(0, false)).toBeNull();
    expect(itemScore(2.5, false)).toBeNull();
  });

  it('scores team as the mean of team members, leader separately, whole numbers only', () => {
    const responses = [
      { role: 'team_member', answers: answersAt(items, 4) },
      { role: 'team_member', answers: answersAt(items, 3) },
      { role: 'team_member', answers: answersAt(items, 3) },
      { role: 'leader', answers: answersAt(items, 5) },
    ];
    const s = scoreV3Round(items, responses);
    expect(s.teamResponses).toBe(3);
    const clarity = s.conditions.find((c) => c.key === 'clarity');
    expect(clarity.team).toBe(58); // (75 + 50 + 50) / 3 = 58.33
    expect(clarity.leader).toBe(100);
    expect(clarity.gap).toBe(42);
    expect(clarity.direction).toBe('leader_higher');
    for (const c of [...s.conditions, ...s.results]) {
      expect(Number.isInteger(c.team)).toBe(true);
    }
    expect(s.results.map((r) => r.key)).toEqual(['trust', 'commitment']);
  });

  it('ignores the trial item', () => {
    const trial = items.find((i) => i.is_trial);
    const a = answersAt(items, 4);
    const b = { ...a, [trial.stable_id]: 1 };
    const s1 = scoreV3Round(items, [{ role: 'team_member', answers: a }]);
    const s2 = scoreV3Round(items, [{ role: 'team_member', answers: b }]);
    expect(s1.conditions).toEqual(s2.conditions);
  });

  it('reads mirror gaps as directions within a band', () => {
    expect(mirrorDirection(MIRROR_AGREEMENT_BAND)).toBe('in_agreement');
    expect(mirrorDirection(-MIRROR_AGREEMENT_BAND)).toBe('in_agreement');
    expect(mirrorDirection(MIRROR_AGREEMENT_BAND + 1)).toBe('leader_higher');
    expect(mirrorDirection(-MIRROR_AGREEMENT_BAND - 1)).toBe('leader_lower');
    expect(mirrorDirection(null)).toBeNull();
  });

  it('labels confidence by team count', () => {
    expect(confidenceFor(7).label).toBe('Early read');
    expect(confidenceFor(8).label).toBe('Solid read');
  });

  it('computes drift against the previous round, null in round 1', () => {
    const now = [{ key: 'clarity', team: 60 }];
    const before = [{ key: 'clarity', team: 70 }];
    expect(computeDrift(now, null)).toBeNull();
    const d = computeDrift(now, before);
    expect(d.find((x) => x.key === 'clarity').change).toBe(-10);
    expect(d.find((x) => x.key === 'voice').change).toBeNull();
  });

  it('names the three patterns', () => {
    const cond = (vals, dir = 'in_agreement') =>
      CONDITION_KEYS.map((k) => ({ key: k, team: vals[k] ?? 65, direction: dir }));
    expect(detectPatterns(cond({ support: 80, accountability: 40 })).map((p) => p.key)).toEqual(['care_avoids_hard_things']);
    expect(detectPatterns(cond({ accountability: 80, voice: 40 })).map((p) => p.key)).toEqual(['standards_through_fear']);
    expect(detectPatterns(cond({}, 'leader_higher')).map((p) => p.key)).toEqual(['filtered_picture']);
    expect(detectPatterns(cond({}))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('v3 privacy gate', () => {
  const { items } = buildV3Round('privacy-co', 1);
  const team = (n, level = 4) => Array.from({ length: n }, () => ({ role: 'team_member', answers: answersAt(items, level) }));
  const leader = { role: 'leader', answers: answersAt(items, 5) };

  it('needs five team members, leader not counted', () => {
    expect(MIN_TEAM_RESPONSES).toBe(5);
    expect(teamResultsAllowed(4)).toBe(false);
    expect(teamResultsAllowed(5)).toBe(true);
    const r = gateRoundResults({ items, responses: [...team(4), leader], roundClosed: true });
    expect(r.ready).toBe(false);
    expect(r).toMatchObject({ teamResponses: 4, needed: 5, reason: 'not_enough_responses' });
    expect(r.conditions).toBeUndefined();
    expect(r.mirror).toBeUndefined();
  });

  it('still shows the leader their own answers below the minimum', () => {
    const r = gateRoundResults({ items, responses: [...team(2), leader], roundClosed: true });
    expect(r.leaderOwn.answered).toBe(true);
    expect(r.leaderOwn.conditions.find((c) => c.key === 'clarity').score).toBe(100);
    expect(JSON.stringify(r)).not.toMatch(/"team":/);
  });

  it('holds team results while the round is open', () => {
    const r = gateRoundResults({ items, responses: [...team(6), leader], roundClosed: false });
    expect(r).toMatchObject({ ready: false, reason: 'round_open', teamResponses: 6 });
  });

  it('returns only combined numbers when ready', () => {
    const r = gateRoundResults({ items, responses: [...team(5), leader], roundClosed: true });
    expect(r.ready).toBe(true);
    expect(r.conditions).toHaveLength(7);
    expect(r.results).toHaveLength(2);
    expect(r.mirror).toHaveLength(9);
    expect(r.confidence.label).toBe('Early read');
    expect(r.drift).toBeNull();
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/answers|respondent|completed_at|created_at|timestamp/);
    expect(r).not.toHaveProperty('ideas');
  });

  it('only computes drift against a previous round that also passed the gate', () => {
    const prevItems = buildV3Round('privacy-co', 1).items;
    const prevSmall = { items: prevItems, responses: team(3, 2) };
    const prevOk = { items: prevItems, responses: team(5, 2) };
    const cur = { items, responses: team(5, 4), roundClosed: true };
    expect(gateRoundResults({ ...cur, previous: prevSmall }).drift).toBeNull();
    const d = gateRoundResults({ ...cur, previous: prevOk }).drift;
    expect(d.find((x) => x.key === 'clarity').change).toBe(50);
  });

  it('applies the same minimum to a division cut', () => {
    const rows = [...team(6).map((r, i) => ({ ...r, division_id: i < 3 ? 'd1' : 'd2' })), leader];
    const cut = rows.filter((r) => r.role === 'leader' || r.division_id === 'd1');
    expect(gateRoundResults({ items, responses: cut, roundClosed: true }).ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('v3 submission checks', () => {
  const { items } = buildV3Round('submit-co', 1);
  const full = answersAt(items, 4);
  const trial = items.find((i) => i.is_trial);

  it('accepts every scored item answered, trial optional', () => {
    expect(validateV3Answers(items, full).ok).toBe(true);
    expect(validateV3Answers(items, { ...full, [trial.stable_id]: 2 }).ok).toBe(true);
  });

  it('rejects empty, missing, foreign and out-of-range answers', () => {
    expect(validateV3Answers(items, {}).ok).toBe(false);
    expect(validateV3Answers(items, null).ok).toBe(false);
    expect(validateV3Answers(items, [4, 4]).ok).toBe(false);
    const missing = { ...full };
    delete missing[Object.keys(missing)[0]];
    const m = validateV3Answers(items, missing);
    expect(m.ok).toBe(false);
    expect(m.missing).toHaveLength(1);
    expect(validateV3Answers(items, { ...full, 'v3.clarity.9.A': 3 }).ok).toBe(false);
    const k = Object.keys(full)[0];
    expect(validateV3Answers(items, { ...full, [k]: 6 }).ok).toBe(false);
    expect(validateV3Answers(items, { ...full, [k]: '4' }).ok).toBe(false);
    expect(validateV3Answers(items, { ...full, [k]: 3.5 }).ok).toBe(false);
    expect(validateV3Answers(items, { ...full, [trial.stable_id]: 9 }).ok).toBe(false);
  });

  it('checks submission ids and hashes them per round', () => {
    expect(isValidSubmissionId('1234567890abcdef')).toBe(true);
    expect(isValidSubmissionId('short')).toBe(false);
    expect(isValidSubmissionId('bad id with spaces!!')).toBe(false);
    const h1 = submissionKeyHash('dep-1', 'abcdefabcdefabcdef');
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toBe(submissionKeyHash('dep-2', 'abcdefabcdefabcdef'));
  });

  it('rate limiter blocks bursts and recovers after the window', () => {
    let t = 0;
    const allow = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect([allow('a'), allow('a'), allow('a'), allow('a')]).toEqual([true, true, true, false]);
    expect(allow('b')).toBe(true);
    t = 1500;
    expect(allow('a')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('v3 rounds helpers', () => {
  it('counts rounds across every instrument', () => {
    expect(nextRoundNumberFrom({})).toBe(1);
    expect(
      nextRoundNumberFrom({
        deployments: [{ survey_index: 'S2' }, { survey_index: 'S1', round_number: null }],
        snapshots: [{ survey_index: 'S3' }],
        rounds: [{ round_number: 1 }],
      })
    ).toBe(4);
  });

  it('reads round status from status and close date', () => {
    const now = new Date('2026-11-16T12:00:00Z');
    expect(roundStatus({ status: 'active', closes_at: '2026-11-20T00:00:00Z' }, now)).toBe('open');
    expect(roundStatus({ status: 'active', closes_at: '2026-11-10T00:00:00Z' }, now)).toBe('closed');
    expect(roundStatus({ status: 'closed' }, now)).toBe('closed');
    expect(roundStatus({ status: 'pending' }, now)).toBe('not_open');
  });
});
