/**
 * @jest-environment node
 *
 * The prompt is the whole product here — a wrong word costs a 40-second
 * generation to discover. These lock the instructions that were learned from
 * real output rather than assumed.
 */
import {
  buildLikenessArtworkPrompt,
  DEFAULT_SCENE,
  DEFAULT_WARDROBE,
} from '../ao/likenessPrompt.js';

describe('buildLikenessArtworkPrompt', () => {
  it('places the subject in the outer 40% so the text panel cannot clip him', () => {
    // Halves were the bug. The card covers the inner ~46% with a panel plus a
    // fade, so a subject filling a full half was always clipped by geometry.
    const p = buildLikenessArtworkPrompt({ subjectSide: 'right' });
    expect(p).toMatch(/position him on the RIGHT side of the frame, occupying roughly the outer 40%/);
    expect(p).toMatch(/running to the LEFT edge, is empty near-black background/);
  });

  it('flips the empty side when the subject moves', () => {
    const p = buildLikenessArtworkPrompt({ subjectSide: 'left' });
    expect(p).toMatch(/position him on the LEFT side/);
    expect(p).toMatch(/running to the RIGHT edge/);
  });

  it('falls back to the right side for an unknown value', () => {
    expect(buildLikenessArtworkPrompt({ subjectSide: 'sideways' })).toMatch(
      /position him on the RIGHT side/
    );
  });

  it('treats the job as a background and wardrobe swap, not a new photograph', () => {
    // gpt-image-1 will not hold a pose. Asked to re-stage the scene it moved him
    // out of the chair entirely, so the instruction is to change two things and
    // leave the man alone.
    const p = buildLikenessArtworkPrompt();
    expect(p).toMatch(/KEEP HIM EXACTLY AS HE IS/);
    expect(p).toMatch(/CHANGE ONLY TWO THINGS/);
    expect(p).toMatch(/not a new photograph/i);
  });

  it('keeps the subject brighter than the room', () => {
    const p = buildLikenessArtworkPrompt();
    expect(p).toMatch(/two to three stops darker than he is/i);
    expect(p).toMatch(/high micro-contrast/i);
  });

  it('forbids the model from drawing any text or logo', () => {
    // The canvas sets all type. Anything the model letters has to be thrown away.
    const p = buildLikenessArtworkPrompt();
    for (const banned of ['no text', 'no lettering', 'no logos', 'no watermarks']) {
      expect(p).toContain(banned);
    }
  });

  it('holds the subject at his real age and texture', () => {
    // Bart on the first output: "Face is 15 years younger than I really am ...
    // Hair and Beard are too perfect."
    const p = buildLikenessArtworkPrompt();
    expect(p).toMatch(/do not de-age him/i);
    expect(p).toMatch(/do not smooth the skin/i);
    expect(p).toMatch(/not styled, trimmed or groomed/i);
  });

  it('never states an age in years', () => {
    // A prior version asserted "mid fifties" — a figure nobody had established.
    // The model aged him past his real age to satisfy it, and Bart's verdict on
    // that output was "that guy is now 15 years older than I am." The reference
    // photograph is the only age evidence; naming a number overrides it.
    const p = buildLikenessArtworkPrompt();
    expect(p).not.toMatch(/\b(twenties|thirties|forties|fifties|sixties|seventies)\b/i);
    expect(p).not.toMatch(/\b(?:aged?\s+)?\d{2}\s*(?:years old|-year-old)\b/i);
    expect(p).toMatch(/EXACTLY as old as he does in the reference/i);
    expect(p).toMatch(/do not age him up/i);
  });

  it('pins glasses and beard as identity regardless of wardrobe', () => {
    // Asked for a hoodie in a warehouse, the model removed his glasses.
    const p = buildLikenessArtworkPrompt({ wardrobe: 'a black hoodie' });
    expect(p).toMatch(/keep his dark-framed rectangular eyeglasses/i);
    expect(p).toMatch(/regardless of the clothing or setting/i);
  });

  it('keeps tattoos but stages them away from focus', () => {
    // Bart: "Many times they are rendered inaccurately. Don't remove them, but
    // the system needs to know I know it will have a hard time with them."
    // Accuracy the model cannot deliver is not worth asking for; hiding the
    // problem in the composition is.
    const p = buildLikenessArtworkPrompt();
    expect(p).toMatch(/never remove or bare-over them/i);
    expect(p).toMatch(/do NOT make them a focal point/i);
    expect(p).toMatch(/sleeves down|angled away|shadow or soft focus/i);
    expect(p).toMatch(/must not be\s+invented, restyled/i);
  });

  it('accepts a custom scene and wardrobe', () => {
    const p = buildLikenessArtworkPrompt({
      scene: 'a weathered brick warehouse at dusk',
      wardrobe: 'a black hoodie',
    });
    expect(p).toContain('a weathered brick warehouse at dusk');
    expect(p).toContain('a black hoodie');
    expect(p).not.toContain(DEFAULT_SCENE);
    expect(p).not.toContain(DEFAULT_WARDROBE);
  });

  it('uses the defaults when nothing is supplied', () => {
    const p = buildLikenessArtworkPrompt();
    expect(p).toContain(DEFAULT_SCENE);
    expect(p).toContain(DEFAULT_WARDROBE);
  });

  it('collapses whitespace into a single clean line', () => {
    const p = buildLikenessArtworkPrompt({ extra: '   ' });
    expect(p).not.toMatch(/\s{2,}/);
    expect(p).toBe(p.trim());
  });
});
