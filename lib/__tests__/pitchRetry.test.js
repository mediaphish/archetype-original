/**
 * @jest-environment node
 *
 * Bart, 2026-09-15: "I want it to go away if it's already been done or has
 * overlap." A repeat pitch is replaced, never shown.
 */
import { mergeMatches, buildPitchRetryInstruction, overlapExhaustedReply, MAX_PITCH_RETRIES } from '../ao/pitchRetry.js';

const twenty = { slug: 'twenty-points-apart', title: 'Twenty Points Apart', url: '/journal/twenty-points-apart', published_at: '2026-08-28T11:01:26Z' };
const trust = { slug: 'ali-series-trust-the-condition-that-cannot-be-declared', title: 'The 7 Conditions: Trust', url: '/journal/ali-series-trust-the-condition-that-cannot-be-declared', published_at: null };

describe('pitch retry', () => {
  it('accumulates every matched post once', () => {
    expect(mergeMatches([twenty], [twenty, trust]).map((m) => m.slug)).toEqual([twenty.slug, trust.slug]);
  });

  it('tells the model the pitch was discarded and names what to avoid', () => {
    const text = buildPitchRetryInstruction([twenty]);
    expect(text).toContain('discarded before Bart saw it');
    expect(text).toContain('"Twenty Points Apart" (/journal/twenty-points-apart, published 2026-08-28)');
    expect(text).toContain('Do not mention the discarded pitch');
  });

  it('gives Bart a plain message, not the repeat, when every attempt overlaps', () => {
    const reply = overlapExhaustedReply([twenty, trust]);
    expect(reply).toContain('already covered in what you have published');
    expect(reply).toContain('"The 7 Conditions: Trust" (/journal/ali-series-trust-the-condition-that-cannot-be-declared)');
    expect(reply).not.toMatch(/—/);
  });

  it('bounds the retries so a turn cannot run away', () => {
    expect(MAX_PITCH_RETRIES).toBeGreaterThanOrEqual(1);
    expect(MAX_PITCH_RETRIES).toBeLessThanOrEqual(3);
  });
});
