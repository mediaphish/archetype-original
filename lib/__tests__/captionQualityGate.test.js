import {
  evaluateCaptionQualityGate,
  captionSimilarity,
  captionSelfRepetitionRatio,
  CAPTION_STUB_FLOOR,
  CAPTION_NEAR_DUPLICATE_THRESHOLD,
  CAPTION_SELF_REPETITION_FLOOR,
} from '../ao/waypointGates.js';

/**
 * A real published caption set, pulled from ao_scheduled_posts on 2026-08-21.
 * All four share a quoted Burns sentence and differ in the commentary around
 * it — which is what good per-channel copy looks like, not duplication.
 *
 * This set is the regression anchor. handleScheduleCaptions treats this gate as
 * a hard block, and before 2026-08-21 the gate rejected every one of these:
 * three for length, three for lacking a call to action. Auto could not schedule
 * captions written in Bart's own voice.
 */
const REAL_PUBLISHED_SET = {
  linkedin_personal:
    'James MacGregor Burns won the Pulitzer Prize for his work on leadership and drew a line most ' +
    'organizations still cross without realizing it. Leadership is not just about getting people to ' +
    'do things. It is about transforming them. The leader whose goal is the development of the people ' +
    'doing the tasks is building something that outlasts any single initiative. #Leadership',
  instagram_business:
    'Leadership is not about getting people to do things. It is about transforming them. Burns. The ' +
    'difference between a manager and a leader in one sentence. Link in bio. #Leadership',
  facebook_business:
    'Leadership is not just about getting people to do things. It is about transforming them. James ' +
    'MacGregor Burns. The sentence that exposes most performance management systems. #Leadership',
  twitter:
    'Leadership is not about getting people to do things. It is about transforming them. Burns. Task ' +
    'completion is management. Transformation is leadership.',
};

/** The "you are mailing it in" failure: one beat restated on every channel. */
const BEAT =
  'Nehemiah rebuilt the wall with one hand on the trowel and one on the weapon. That is what ' +
  'leadership under pressure actually looks like when the threat is both outside and inside the room. ';
const REPEATED_SET = {
  linkedin_personal: BEAT.repeat(2) + 'What do you think?',
  facebook_business: BEAT.repeat(2) + 'What do you think?',
  instagram_business: BEAT.repeat(2) + 'Link in bio.',
  twitter: BEAT + 'What do you think?',
};

describe('evaluateCaptionQualityGate', () => {
  it("passes Bart's real published captions", () => {
    const result = evaluateCaptionQualityGate(REAL_PUBLISHED_SET);
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('blocks one beat restated across channels', () => {
    // The failure this gate was built for and did not perform: length and CTA
    // both passed these cleanly, because nothing compared captions to one another.
    const result = evaluateCaptionQualityGate(REPEATED_SET);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.reasons.some((r) => /near-duplicate/i.test(r)))).toBe(true);
  });

  it('blocks padding written to clear a length floor', () => {
    const result = evaluateCaptionQualityGate({
      linkedin_personal: 'Leadership matters. '.repeat(20),
    });
    expect(result.ok).toBe(false);
    expect(result.failures[0].reasons.some((r) => /repeats itself/i.test(r))).toBe(true);
  });

  it('blocks a stub', () => {
    const result = evaluateCaptionQualityGate({ twitter: 'Too short.' });
    expect(result.ok).toBe(false);
    expect(result.failures[0].reasons.some((r) => /stub/i.test(r))).toBe(true);
  });

  it('warns about a missing CTA without blocking', () => {
    // Only 1% of his Instagram captions and at most 19% anywhere contain a
    // question; he closes on a declarative line. Blocking on this argued with
    // the owner's voice.
    const result = evaluateCaptionQualityGate({
      linkedin_personal:
        'Standards do not hold because someone wrote them down. They hold because a leader keeps ' +
        'paying the cost of them in public, on the days it is expensive and nobody is watching.',
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => /question or CTA/i.test(w.reason))).toBe(true);
  });

  it('accepts an empty set rather than inventing a failure', () => {
    expect(evaluateCaptionQualityGate({}).ok).toBe(true);
    expect(evaluateCaptionQualityGate(null).ok).toBe(true);
  });

  it('does not penalise a short caption for being short', () => {
    // His best twitter copy is 151 characters. Length is not quality.
    const result = evaluateCaptionQualityGate({ twitter: REAL_PUBLISHED_SET.twitter });
    expect(result.ok).toBe(true);
  });
});

describe('captionSimilarity', () => {
  it('keeps real per-channel copy well under the threshold', () => {
    const channels = Object.values(REAL_PUBLISHED_SET);
    let max = 0;
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        max = Math.max(max, captionSimilarity(channels[i], channels[j]));
      }
    }
    // Measured at 0.382 on real data; the threshold is 0.65.
    expect(max).toBeLessThan(CAPTION_NEAR_DUPLICATE_THRESHOLD);
  });

  it('scores restated copy well over the threshold', () => {
    expect(
      captionSimilarity(REPEATED_SET.linkedin_personal, REPEATED_SET.facebook_business)
    ).toBeGreaterThan(CAPTION_NEAR_DUPLICATE_THRESHOLD);
  });

  it('is 0 for text too short to shingle', () => {
    expect(captionSimilarity('hi', 'hi')).toBe(0);
  });
});

describe('captionSelfRepetitionRatio', () => {
  it('scores real captions as fully distinct', () => {
    for (const text of Object.values(REAL_PUBLISHED_SET)) {
      expect(captionSelfRepetitionRatio(text)).toBeGreaterThanOrEqual(CAPTION_SELF_REPETITION_FLOOR);
    }
  });

  it('scores padding far below the floor', () => {
    expect(captionSelfRepetitionRatio('Leadership matters. '.repeat(20))).toBeLessThan(0.2);
  });

  it('returns 1 for copy too short to judge', () => {
    expect(captionSelfRepetitionRatio('Short punchy line.')).toBe(1);
  });
});

describe('thresholds', () => {
  it('are the calibrated values, not round guesses', () => {
    expect(CAPTION_STUB_FLOOR).toBe(70);
    expect(CAPTION_NEAR_DUPLICATE_THRESHOLD).toBe(0.65);
    expect(CAPTION_SELF_REPETITION_FLOOR).toBe(0.6);
  });
});
