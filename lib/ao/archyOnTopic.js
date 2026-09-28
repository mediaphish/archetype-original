/**
 * The corpus decides what is on topic, not a classifier working from memory.
 *
 * 2026-09-28, found by scripts/eval-archy.mjs on its first run. Asked "Tell me
 * about the Jonathan Archetype", Archy answered: "That's a question for a
 * different AI entirely. I'm here for leadership and culture." The Jonathan
 * Archetype is a leadership post on Bart's own site, published three days
 * earlier, and it is in the corpus.
 *
 * The off-topic classifier is given the question and nothing else, and asked
 * whether it has "any connection to leadership, culture, business, teams, or
 * organizational health". A model with no context reads "the Jonathan
 * Archetype" as scripture or mythology and says no. It runs before the
 * retrieved passages are consulted, so the material that would have settled it
 * was sitting unused a few hundred lines above.
 *
 * The class this belongs to is larger than one post: every distinctive title
 * Bart has written is at risk, and the visitors who ask by title are the ones
 * who just read something and came to ask about it. They are the best traffic
 * the site gets and they were the most likely to be turned away.
 *
 * So the rule is: if Bart has written about it, it is on topic. A classifier
 * guessing from a title does not get to overrule his own library.
 */

/**
 * Passages strong enough to settle the question without a classifier.
 *
 * Deliberately stricter than the retrieval floor. A weak semantic echo is not
 * evidence a topic is covered, and the point here is to override a refusal, so
 * it has to be the kind of hit that means Bart actually wrote about this.
 */
export const ON_TOPIC_SIMILARITY = 0.5;
export const ON_TOPIC_MIN_HITS = 2;

/**
 * Did the corpus answer the on-topic question by itself?
 *
 * @param {Array<{similarity?: number, matched_phrase?: string}>} passageHits
 * @returns {boolean}
 */
export function corpusCoversTopic(passageHits) {
  const hits = Array.isArray(passageHits) ? passageHits : [];
  if (!hits.length) return false;

  // A literal phrase match is Bart's own wording coming back. One is enough:
  // that is the "Jonathan Archetype" case exactly.
  if (hits.some((hit) => hit && hit.matched_phrase)) return true;

  const strong = hits.filter((hit) => Number(hit?.similarity) >= ON_TOPIC_SIMILARITY);
  return strong.length >= ON_TOPIC_MIN_HITS;
}
