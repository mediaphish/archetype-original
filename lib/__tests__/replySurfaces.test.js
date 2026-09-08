/**
 * @jest-environment node
 *
 * The guardrail was policing the wrong surface.
 *
 * 2026-09-08. Bart asked why "sit with" survived two drafts. Auto had to quote
 * the phrase to answer him. The quote tripped the voice detector, the entire
 * reply was handed to a second model to be rewritten, and the answer he asked
 * for was replaced. Meanwhile the phrase that actually shipped in the post,
 * "the hardest leadership failures to sit with", matched nothing on the list
 * and went out twice.
 *
 * The system sanitised the conversation and published the violation.
 */
import { splitReplySurfaces, rejoinReplySurfaces } from '../ao/replySurfaces.js';
import { detectVoiceViolations } from '../ao/voiceGuardrails.js';

const REPLY = `Why "sit with that" got through: I patched the line you flagged and did not re-scan the rest.

[ARTIFACT type="draft" label="The Cain Archetype"]
# The Cain Archetype

That is the shape of the hardest leadership failures to sit with.
[/ARTIFACT]`;

describe('splitReplySurfaces', () => {
  it('separates the conversation from the post', () => {
    const { dialogue, prose } = splitReplySurfaces(REPLY);
    expect(dialogue).toMatch(/Why "sit with that" got through/);
    expect(dialogue).not.toMatch(/Cain Archetype/);
    expect(prose[0]).toMatch(/Cain Archetype/);
  });

  it('leaves a pure conversation entirely alone', () => {
    const { dialogue, prose, hasProse } = splitReplySurfaces('I disagree, and here is why.');
    expect(hasProse).toBe(false);
    expect(prose).toEqual([]);
    expect(dialogue).toBe('I disagree, and here is why.');
  });

  it('handles several artifacts in one reply', () => {
    const two = `intro\n[ARTIFACT type="draft"]one[/ARTIFACT]\nmiddle\n[ARTIFACT type="captions"]two[/ARTIFACT]\nend`;
    const { prose, dialogue } = splitReplySurfaces(two);
    expect(prose).toEqual(['one', 'two']);
    expect(dialogue).toMatch(/intro/);
    expect(dialogue).toMatch(/end/);
  });

  it('is not corrupted by being called twice', () => {
    // The pattern is module scope with /g, which is stateful. A stale lastIndex
    // would make the second call silently miss the artifact.
    expect(splitReplySurfaces(REPLY).prose).toHaveLength(1);
    expect(splitReplySurfaces(REPLY).prose).toHaveLength(1);
  });

  it('handles empty input', () => {
    expect(splitReplySurfaces('')).toEqual({ dialogue: '', prose: [], hasProse: false });
    expect(splitReplySurfaces(null).hasProse).toBe(false);
  });
});

describe('the surfaces have opposite outcomes under the detector', () => {
  it('flags the post and would have caught what shipped', () => {
    const { prose } = splitReplySurfaces(REPLY);
    expect(detectVoiceViolations(prose[0]).length).toBeGreaterThan(0);
  });

  it('flags the dialogue too, which is exactly why dialogue must never be checked', () => {
    // Auto's honest answer trips the detector. Under the old code that answer
    // was destroyed. It is now never passed to the guardrail at all.
    const { dialogue } = splitReplySurfaces(REPLY);
    expect(detectVoiceViolations(dialogue).length).toBeGreaterThan(0);
  });
});

describe('rejoinReplySurfaces', () => {
  it('puts corrected prose back and leaves the conversation untouched', () => {
    const { prose } = splitReplySurfaces(REPLY);
    const fixed = prose.map((p) => p.replace(/failures to sit with/, 'failures a leader has to answer for'));
    const out = rejoinReplySurfaces(REPLY, fixed);

    expect(out).toMatch(/Why "sit with that" got through/); // dialogue survives verbatim
    expect(out).toMatch(/failures a leader has to answer for/);
    expect(out).not.toMatch(/failures to sit with/);
    expect(out).toMatch(/\[ARTIFACT type="draft" label="The Cain Archetype"\]/); // attributes survive
  });

  it('keeps the original block when the corrector returns nothing', () => {
    // Losing a draft is worse than a surviving tic.
    expect(rejoinReplySurfaces(REPLY, [''])).toMatch(/failures to sit with/);
    expect(rejoinReplySurfaces(REPLY, [])).toBe(REPLY);
  });
});

describe('the bare pattern that shipped twice', () => {
  it('is now detected', () => {
    const hits = detectVoiceViolations('the hardest leadership failures to sit with').map((v) => v.id);
    expect(hits).toContain('sit-with-bare');
  });

  it('still catches the older variants', () => {
    expect(detectVoiceViolations('worth sitting with').length).toBeGreaterThan(0);
    expect(detectVoiceViolations('something to sit with').length).toBeGreaterThan(0);
  });
});
