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

    // Asserted in UTC on purpose. Date-only ISO strings parse as UTC midnight,
    // and getSurveyAvailableAt reads these with getUTC*, so UTC is the real
    // calendar here. Local getters made the expected day drift by timezone,
    // which is why the exact-day case below used to pass in US Central and fail
    // in UTC — the timezone Vercel actually runs in.
    it('S2 = baseline + 3 months', () => {
      const baseline = new Date('2026-01-19');
      const s2 = calculateSurveyDate(baseline, 'S2');
      expect(s2.getUTCFullYear()).toBe(2026);
      expect(s2.getUTCMonth()).toBe(3); // April
      expect(s2.getUTCDate()).toBe(19);
    });

    // Was a real bug: addMonths did setMonth(0 + 3), producing "April 31",
    // which JavaScript rolled forward to May 1. The month-end rule then checked
    // May's last day, found nothing to clamp, and let it through — scheduling
    // the survey a month late for any baseline on the 29th, 30th, or 31st.
    it('month-end rule: Jan 31 + 3 months -> Apr 30', () => {
      const baseline = new Date('2026-01-31');
      const s2 = calculateSurveyDate(baseline, 'S2');
      expect(s2.getUTCFullYear()).toBe(2026);
      expect(s2.getUTCMonth()).toBe(3);
      expect(s2.getUTCDate()).toBe(30);
    });

    it('month-end rule also holds for a 30th baseline into February', () => {
      const s2 = calculateSurveyDate(new Date('2025-11-30'), 'S2');
      expect(s2.getUTCFullYear()).toBe(2026);
      expect(s2.getUTCMonth()).toBe(1); // February
      expect(s2.getUTCDate()).toBe(28);
    });

    it('crosses a year boundary correctly', () => {
      const s2 = calculateSurveyDate(new Date('2026-11-15'), 'S2');
      expect(s2.getUTCFullYear()).toBe(2027);
      expect(s2.getUTCMonth()).toBe(1); // February
      expect(s2.getUTCDate()).toBe(15);
    });

    it('accepts ISO string baseline', () => {
      const s2 = calculateSurveyDate('2026-01-19', 'S2');
      expect(s2.getUTCFullYear()).toBe(2026);
      expect(s2.getUTCMonth()).toBe(3);
      expect(s2.getUTCDate()).toBe(19);
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
