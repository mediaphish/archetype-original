/**
 * @jest-environment node
 *
 * Card composition rules. The renderer and the image model are exercised by
 * lib/ao/generateQuoteCardImage.background.selftest.mjs and by real generations;
 * these lock the decisions made before either is called.
 */
import { jest } from '@jest/globals';

// generateLikenessCard reaches supabase-admin transitively through the renderer.
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { buildCardSpec, buildSceneArtworkPrompt } from '../ao/generateLikenessCard.js';

describe('buildSceneArtworkPrompt', () => {
  it('forbids people entirely', () => {
    // Bart: "Nice images with the quotes in front of them when they aren't
    // mine." A face nobody can place reads as stock; one that resembles a real
    // person is worse.
    const p = buildSceneArtworkPrompt();
    expect(p).toMatch(/No people, no figures, no faces, no hands/i);
  });

  it('reserves the half opposite the subject side', () => {
    expect(buildSceneArtworkPrompt({ subjectSide: 'right' })).toMatch(
      /LEFT HALF must be near-black empty shadow/
    );
    expect(buildSceneArtworkPrompt({ subjectSide: 'left' })).toMatch(
      /RIGHT HALF must be near-black empty shadow/
    );
  });

  it('forbids lettering, since the canvas sets all type', () => {
    const p = buildSceneArtworkPrompt();
    expect(p).toContain('no text');
    expect(p).toContain('no logos');
  });

  it('uses a supplied scene', () => {
    expect(buildSceneArtworkPrompt({ scene: 'an empty boardroom at night' })).toContain(
      'an empty boardroom at night'
    );
  });
});

describe('buildCardSpec', () => {
  const base = { artworkDataUri: 'data:image/png;base64,AAAA', attribution: 'Bart Paden' };

  it('emits one LINE per display line', () => {
    const spec = buildCardSpec({ ...base, lines: [{ text: 'One' }, { text: 'Two' }] });
    expect(spec.match(/\[LINE/g)).toHaveLength(3); // two lines plus attribution
    expect(spec).toContain('One');
    expect(spec).toContain('Two');
  });

  it('colours only the accented lines', () => {
    const spec = buildCardSpec({
      ...base,
      lines: [{ text: 'Claim', accent: true }, { text: 'Rest', accent: false }],
    });
    expect(spec).toMatch(/color="#D42B1E"[^\]]*\]Claim/);
    expect(spec).toMatch(/\[LINE size="76" gap_after="12"\]Rest/);
  });

  it('sets the attribution in Inter', () => {
    // Small, mixed-case, often carrying a year — all of which Bebas handles badly.
    const spec = buildCardSpec({ ...base, lines: [{ text: 'One' }] });
    expect(spec).toMatch(/font="inter"\]— Bart Paden/);
  });

  it('omits the attribution line when there is no credit', () => {
    const spec = buildCardSpec({ ...base, attribution: '', lines: [{ text: 'One' }] });
    expect(spec.match(/\[LINE/g)).toHaveLength(1);
    expect(spec).not.toContain('—');
  });

  it('always requests the vector lockup and the split layout', () => {
    const spec = buildCardSpec({ ...base, lines: [{ text: 'One' }] });
    expect(spec).toContain('logo="lockup"');
    expect(spec).toContain('layout="split"');
  });

  it('carries ratio and subject side through', () => {
    const spec = buildCardSpec({
      ...base,
      lines: [{ text: 'One' }],
      ratio: 'square',
      subjectSide: 'left',
    });
    expect(spec).toContain('ratio="square"');
    expect(spec).toContain('subject_side="left"');
  });

  it('strips quotes from values so they cannot break out of an attribute', () => {
    // An attribution is free text from the model; an unescaped quote would end
    // the attribute early and corrupt every attribute after it.
    const spec = buildCardSpec({ ...base, attribution: 'He said "go"', lines: [{ text: 'One' }] });
    expect(spec).toContain('He said go');
    expect(spec).not.toContain('said "go"');
  });
});
