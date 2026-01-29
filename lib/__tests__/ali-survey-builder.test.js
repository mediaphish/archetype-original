/**
 * ALI Survey Builder unit tests
 * @jest-environment node
 */

import {
  generateSeed,
  selectDeterministic,
  deterministicShuffle,
  validateSurveyComposition,
  buildSurvey,
} from '../ali-survey-builder.js';

describe('ali-survey-builder', () => {
  describe('generateSeed', () => {
    it('same inputs -> same seed', () => {
      expect(generateSeed('cid', 'S1', 'v1.0')).toBe(generateSeed('cid', 'S1', 'v1.0'));
    });
    it('different clientId -> different seed', () => {
      expect(generateSeed('a', 'S1', 'v1.0')).not.toBe(generateSeed('b', 'S1', 'v1.0'));
    });
    it('different surveyIndex -> different seed', () => {
      expect(generateSeed('cid', 'S1', 'v1.0')).not.toBe(generateSeed('cid', 'S2', 'v1.0'));
    });
  });

  describe('selectDeterministic', () => {
    it('same seed -> same selection', () => {
      const arr = [1, 2, 3];
      expect(selectDeterministic(arr, 's1')).toBe(selectDeterministic(arr, 's1'));
    });
    it('throws on empty array', () => {
      expect(() => selectDeterministic([], 's')).toThrow('Cannot select from empty array');
    });
  });

  describe('deterministicShuffle', () => {
    it('same seed -> same order', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(deterministicShuffle(arr, 's1')).toEqual(deterministicShuffle(arr, 's1'));
    });
    it('does not mutate input', () => {
      const arr = [1, 2, 3];
      deterministicShuffle(arr, 's1');
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe('validateSurveyComposition', () => {
    const validQuestions = [
      { stable_id: 'A1', is_anchor: true, pattern: 'clarity', is_negative: false, status: 'active' },
      { stable_id: 'A2', is_anchor: true, pattern: 'consistency', is_negative: false, status: 'active' },
      { stable_id: 'A3', is_anchor: true, pattern: 'trust', is_negative: false, status: 'active' },
      { stable_id: 'P1', is_anchor: false, pattern: 'clarity', is_negative: false, status: 'active' },
      { stable_id: 'P2', is_anchor: false, pattern: 'consistency', is_negative: true, status: 'active' },
      { stable_id: 'P3', is_anchor: false, pattern: 'trust', is_negative: false, status: 'active' },
      { stable_id: 'P4', is_anchor: false, pattern: 'communication', is_negative: true, status: 'active' },
      { stable_id: 'P5', is_anchor: false, pattern: 'alignment', is_negative: false, status: 'active' },
      { stable_id: 'P6', is_anchor: false, pattern: 'stability', is_negative: false, status: 'active' },
      { stable_id: 'P7', is_anchor: false, pattern: 'leadership_drift', is_negative: false, status: 'active' },
    ];
    it('valid 3 anchors, 7 patterns, 2-4 negatives, 10 total -> isValid', () => {
      const r = validateSurveyComposition(validQuestions);
      expect(r.isValid).toBe(true);
      expect(r.composition.anchorCount).toBe(3);
      expect(r.composition.patternCount).toBe(7);
      expect(r.composition.negativeCount).toBe(2);
      expect(r.composition.totalCount).toBe(10);
    });
    it('duplicate stable_id -> invalid', () => {
      const dup = [...validQuestions];
      dup[3] = { ...dup[3], stable_id: 'A1' };
      const r = validateSurveyComposition(dup);
      expect(r.isValid).toBe(false);
      expect(r.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });
    it('wrong total count -> invalid', () => {
      const r = validateSurveyComposition(validQuestions.slice(0, 9));
      expect(r.isValid).toBe(false);
      expect(r.errors.some((e) => e.includes('10'))).toBe(true);
    });
  });

  describe('buildSurvey determinism', () => {
    const clientId = '11111111-1111-1111-1111-111111111111';
    const surveyIndex = 'S1';
    const instrumentVersion = 'v1.0';

    const questionBank = [
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

    it('same seed -> identical survey (stable_ids in same order)', () => {
      const a = buildSurvey(questionBank, clientId, surveyIndex, instrumentVersion);
      const b = buildSurvey(questionBank, clientId, surveyIndex, instrumentVersion);
      const idsA = a.questions.map((q) => q.stable_id);
      const idsB = b.questions.map((q) => q.stable_id);
      expect(idsA).toEqual(idsB);
    });

    it('constraints: 3 anchors, 7 patterns, 2-4 negatives, 10 total', () => {
      const out = buildSurvey(questionBank, clientId, surveyIndex, instrumentVersion);
      const v = out.validation;
      expect(v.isValid).toBe(true);
      expect(v.composition.anchorCount).toBe(3);
      expect(v.composition.patternCount).toBe(7);
      expect(v.composition.negativeCount).toBeGreaterThanOrEqual(2);
      expect(v.composition.negativeCount).toBeLessThanOrEqual(4);
      expect(v.composition.totalCount).toBe(10);
      expect(out.questions.length).toBe(10);
    });

    it('does not mutate question bank', () => {
      const bank = questionBank.map((q) => ({ ...q }));
      buildSurvey(bank, clientId, surveyIndex, instrumentVersion);
      expect(bank).toEqual(questionBank.map((q) => ({ ...q })));
    });
  });
});
