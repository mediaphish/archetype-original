/**
 * @jest-environment node
 *
 * The em dashes Archy used on the live site (2026-09-28).
 */
import { stripProseDashes, ARCHY_DASH_RULE } from '../ao/archyVoice.js';

describe('stripProseDashes', () => {
  it('turns a clause separator into the comma Bart would have used', () => {
    expect(stripProseDashes("It isn't part of Culture Science itself — it's the rhythm behind ALI.")).toBe(
      "It isn't part of Culture Science itself, it's the rhythm behind ALI."
    );
  });

  it('handles every dash in the answer Archy actually gave', () => {
    const real =
      'It runs on a quarterly cadence — three pulse check-ins, then a deeper Q4 review. ' +
      'SMBs live in 90-day cycles — so checking in that often keeps leadership honest. ' +
      'Now, the boundaries — this is where people assume too much.';
    const out = stripProseDashes(real);
    expect(out).not.toMatch(/[—–]/);
    expect(out).toContain('quarterly cadence, three pulse check-ins');
    expect(out).toContain('90-day cycles, so checking in');
  });

  it('keeps numeric and labelled ranges intact', () => {
    expect(stripProseDashes('The data lines up as Q1–Q3.')).toBe('The data lines up as Q1–Q3.');
    expect(stripProseDashes('over 2020–2024')).toBe('over 2020–2024');
    expect(stripProseDashes('runs Q1–Q4 then stops — for now')).toBe('runs Q1–Q4 then stops, for now');
  });

  it('leaves hyphens alone', () => {
    expect(stripProseDashes('a 90-day cycle in the Four-Survey Framework')).toBe(
      'a 90-day cycle in the Four-Survey Framework'
    );
  });

  it('does not double up punctuation', () => {
    expect(stripProseDashes('a, — b')).toBe('a, b');
    expect(stripProseDashes('one. — two')).toBe('one. two');
    expect(stripProseDashes('a; — b')).toBe('a; b');
  });

  it('drops a dash opening or closing a line rather than leaving a stray comma', () => {
    expect(stripProseDashes('— a bullet line')).toBe('a bullet line');
    expect(stripProseDashes('trailing —')).toBe('trailing');
  });

  it('returns text without dashes unchanged, and survives empty input', () => {
    expect(stripProseDashes('no dashes here')).toBe('no dashes here');
    expect(stripProseDashes('')).toBe('');
    expect(stripProseDashes(null)).toBe('');
  });
});

describe('ARCHY_DASH_RULE', () => {
  it('states the rule without breaking it', () => {
    expect(ARCHY_DASH_RULE).not.toMatch(/[—–]/);
    expect(ARCHY_DASH_RULE).toMatch(/em dashes/i);
  });
});
