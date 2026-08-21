/**
 * @jest-environment node
 *
 * Bebas Neue is the card display face and has no lowercase. Bart: "Bebas should
 * only be used for these quotes. Short sections of text. Never a huge block."
 *
 * The rule is enforced in code rather than left to whoever writes the card
 * spec, because Auto writes most of them unattended.
 */
import { isTooLongForDisplayFace } from '../ao/cardTypography.js';

describe('isTooLongForDisplayFace', () => {
  it('allows a short claim', () => {
    expect(isTooLongForDisplayFace('Toxic leadership')).toBe(false);
    expect(isTooLongForDisplayFace("isn't a character flaw.")).toBe(false);
  });

  it('allows a full short line from the reference card', () => {
    expect(isTooLongForDisplayFace('Leadership is not a clenched fist.')).toBe(false);
  });

  it('rejects a long corpus pull', () => {
    const long =
      'Accountability is not something you install. It is what remains after a leader ' +
      'has repeatedly chosen clarity over comfort, in public, when it cost them something.';
    expect(isTooLongForDisplayFace(long)).toBe(true);
  });

  it('rejects on word count even when characters are few', () => {
    expect(isTooLongForDisplayFace('a b c d e f g h i j k l m n o p')).toBe(true);
  });

  it('rejects on character count even when word count is low', () => {
    expect(isTooLongForDisplayFace('supercalifragilistic '.repeat(5).trim())).toBe(true);
  });

  it('treats empty input as fine', () => {
    expect(isTooLongForDisplayFace('')).toBe(false);
    expect(isTooLongForDisplayFace(null)).toBe(false);
  });
});
