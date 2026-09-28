/**
 * @jest-environment node
 *
 * "Tell me about the Jonathan Archetype." -> "That's a question for a
 * different AI entirely." (2026-09-28, found by scripts/eval-archy.mjs.)
 */
import { corpusCoversTopic, ON_TOPIC_SIMILARITY, ON_TOPIC_MIN_HITS } from '../ao/archyOnTopic.js';
import { OFF_TOPIC_REPLIES, CANNOT_ANSWER_REPLY, isDecline } from '../ao/archyOffTopicReplies.js';

describe('corpusCoversTopic', () => {
  it('trusts a literal phrase match on its own, which is the Jonathan case', () => {
    expect(corpusCoversTopic([{ similarity: 0.42, matched_phrase: 'jonathan archetype' }])).toBe(true);
  });

  it('needs more than one strong passage when there is no literal match', () => {
    const strong = { similarity: ON_TOPIC_SIMILARITY + 0.1 };
    expect(corpusCoversTopic(Array(ON_TOPIC_MIN_HITS).fill(strong))).toBe(true);
    expect(corpusCoversTopic(Array(ON_TOPIC_MIN_HITS - 1).fill(strong))).toBe(false);
  });

  it('does not let weak echoes vouch for a topic', () => {
    const weak = { similarity: ON_TOPIC_SIMILARITY - 0.05 };
    expect(corpusCoversTopic([weak, weak, weak])).toBe(false);
  });

  it('says no when retrieval found nothing, so a real off-topic question still declines', () => {
    expect(corpusCoversTopic([])).toBe(false);
    expect(corpusCoversTopic(null)).toBe(false);
    expect(corpusCoversTopic(undefined)).toBe(false);
  });

  it('is stricter than the retrieval floor, on purpose', () => {
    expect(ON_TOPIC_SIMILARITY).toBeGreaterThan(0.4);
  });
});

describe('off-topic replies', () => {
  it('never uses a dash, since these skip the output guard entirely', () => {
    for (const reply of OFF_TOPIC_REPLIES) {
      expect(reply).not.toMatch(/[—–]/);
    }
    expect(CANNOT_ANSWER_REPLY).not.toMatch(/[—–]/);
  });

  it('kept every line when they moved out of the route', () => {
    expect(OFF_TOPIC_REPLIES).toHaveLength(20);
    expect(new Set(OFF_TOPIC_REPLIES).size).toBe(20);
  });
});

describe('isDecline', () => {
  it('recognises both ways Archy declines', () => {
    expect(isDecline(CANNOT_ANSWER_REPLY)).toBe(true);
    for (const reply of OFF_TOPIC_REPLIES) expect(isDecline(reply)).toBe(true);
  });

  it('does not mistake a real answer for a decline', () => {
    expect(isDecline('Culture Science explains conditions, not people.')).toBe(false);
    expect(isDecline('')).toBe(false);
    expect(isDecline(null)).toBe(false);
  });
});
