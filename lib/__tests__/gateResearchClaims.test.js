import { findUnbackedActionClaims } from '../ao/gateActionClaims.js';

/** Did the research_citation rule fire for this reply? */
function flagged(text, toolsUsed = []) {
  const { unbacked } = findUnbackedActionClaims(text, { toolsUsed, toolResults: [] });
  return unbacked.some((u) => u.ruleId === 'research_citation');
}

describe('research_citation gate', () => {
  describe('claims from the real Jezebel/Kelo transcripts', () => {
    // This claim has now been made twice: once on 2026-08-18, which is what the
    // gate was written for, and again on 2026-08-21. The original patterns were
    // derived from the first transcript's exact wording and missed the plainest
    // phrasing of the same claim — the sentence Auto actually opened with.
    it('catches "I did the research now", the second transcript\'s opening line', () => {
      expect(
        flagged('I did the research now, since Jezebel needs a modern parallel per your standing note.')
      ).toBe(true);
    });

    it('catches "I found a strong, well-documented one"', () => {
      expect(flagged('I found a strong, well-documented one: Kelo v. City of New London (2005).')).toBe(true);
    });

    it('catches "Verified Kelo facts:"', () => {
      expect(flagged('Verified Kelo facts: In 1998 New London used eminent domain to seize homes.')).toBe(true);
    });
  });

  describe('other ways of asserting research', () => {
    it.each([
      'I researched this and found Kelo v. City of New London.',
      'I just looked it up and the ruling was 5-4.',
      'I ran a search and the development never got built.',
      'I fact-checked the figure.',
      'I found a case from 2005 that matches the pattern exactly.',
      'I found two studies supporting that claim.',
    ])('catches %p', (text) => {
      expect(flagged(text)).toBe(true);
    });
  });

  describe('does not fire without a research claim', () => {
    it.each([
      // "found a" plus a non-research noun must not trip the gate.
      'I found a way to shorten the opening paragraph.',
      // Future intent is not a completed action.
      'I will research this and come back to you.',
      'Want me to look up a modern parallel?',
      // Explicit negation.
      'I have not researched this yet.',
      // Naming a case without claiming to have researched it.
      'Kelo v. City of New London is a case you might consider.',
    ])('allows %p', (text) => {
      expect(flagged(text)).toBe(false);
    });
  });

  describe('does not fire when the search actually ran', () => {
    // web_search is an Anthropic server tool and never appears in client
    // toolResults, so the gate unions evidence.toolsUsed. If that union broke,
    // every genuine research turn would be warned about — worse than silence,
    // because Bart would learn to ignore the warnings.
    it.each([
      'I did the research now.',
      'I found a strong, well-documented case.',
      'Verified facts: the ruling was 5-4.',
    ])('allows %p when web_search was used', (text) => {
      expect(flagged(text, ['web_search'])).toBe(false);
    });
  });
});
