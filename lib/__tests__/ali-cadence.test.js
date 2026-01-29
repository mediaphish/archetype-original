/**
 * ALI Cadence unit tests
 * @jest-environment node
 */

import {
  calculateSurveyDate,
  calculateAvailableAt,
  getNextSurveyIndex,
} from '../ali-cadence.js';

describe('ali-cadence', () => {
  describe('calculateSurveyDate', () => {
    it('S1 returns baseline date unchanged', () => {
      const baseline = new Date('2026-01-19');
      expect(calculateSurveyDate(baseline, 'S1')).toEqual(baseline);
    });

    it('S2 = baseline + 3 months', () => {
      const baseline = new Date('2026-01-19');
      const s2 = calculateSurveyDate(baseline, 'S2');
      expect(s2.getFullYear()).toBe(2026);
      expect(s2.getMonth()).toBe(3); // April
      expect(s2.getDate()).toBeGreaterThanOrEqual(18);
      expect(s2.getDate()).toBeLessThanOrEqual(20);
    });

    it('month-end rule: Jan 31 + 3 months -> Apr 30', () => {
      const baseline = new Date('2026-01-31');
      const s2 = calculateSurveyDate(baseline, 'S2');
      expect(s2.getFullYear()).toBe(2026);
      expect(s2.getMonth()).toBe(3);
      expect(s2.getDate()).toBe(30);
    });

    it('accepts ISO string baseline', () => {
      const s2 = calculateSurveyDate('2026-01-19', 'S2');
      expect(s2.getFullYear()).toBe(2026);
      expect(s2.getMonth()).toBe(3);
      expect(s2.getDate()).toBe(19);
    });

    it('throws on invalid survey_index', () => {
      expect(() => calculateSurveyDate('2026-01-19', 'X1')).toThrow(/Invalid survey_index/);
      expect(() => calculateSurveyDate('2026-01-19', 'S0')).toThrow(/Invalid survey_index/);
    });
  });

  describe('calculateAvailableAt', () => {
    it('returns start of day in UTC for S1', () => {
      const baseline = new Date('2026-01-19T12:00:00Z');
      const at = calculateAvailableAt(baseline, 'S1');
      expect(at.getUTCHours()).toBe(0);
      expect(at.getUTCMinutes()).toBe(0);
      expect(at.getUTCDate()).toBe(19);
      expect(at.getUTCMonth()).toBe(0);
    });
  });

  describe('getNextSurveyIndex', () => {
    it('empty existing -> S1', () => {
      expect(getNextSurveyIndex([])).toBe('S1');
      expect(getNextSurveyIndex(null)).toBe('S1');
    });

    it('S1 exists -> S2', () => {
      expect(getNextSurveyIndex([{ survey_index: 'S1' }])).toBe('S2');
    });

    it('S1,S2,S3 exist -> S4', () => {
      expect(
        getNextSurveyIndex([
          { survey_index: 'S1' },
          { survey_index: 'S2' },
          { survey_index: 'S3' },
        ])
      ).toBe('S4');
    });
  });
});
