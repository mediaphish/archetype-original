/**
 * Shared narrative clustering helpers.
 *
 * Extracted from the Bad Leader Project clustering routine so both BLP
 * stories and ALI narratives can share the same vector-similarity logic
 * without sharing storage, admin surfaces, or public exposure.
 *
 * Each consumer (BLP, ALI) supplies its own table names, embedding
 * source, and cluster table when calling these helpers — the helpers
 * only do math.
 */

/**
 * Parse a Supabase pgvector cell into a flat array of numbers. Accepts
 * either an already-parsed array or a "[1.0,2.0,...]" string.
 */
export function parseEmbedding(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string') {
    const clean = value.replace(/^\[/, '').replace(/\]$/, '');
    if (!clean) return null;
    return clean
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n));
  }
  return null;
}

/**
 * Cosine similarity between two equally-shaped numeric vectors.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Find the best-matching cluster for a candidate embedding among an
 * array of candidate items, each shaped like { embedding, cluster_id }.
 *
 * @param {Array<number>} candidateEmbedding
 * @param {Array<{ embedding: Array<number>, cluster_id: string }>} candidates
 * @param {number} [threshold=0.82] - Minimum similarity required to be considered a match
 * @returns {{ cluster_id: string|null, score: number }}
 */
export function findBestCluster(candidateEmbedding, candidates, threshold = 0.82) {
  if (!candidateEmbedding || !Array.isArray(candidates) || candidates.length === 0) {
    return { cluster_id: null, score: 0 };
  }

  let bestScore = 0;
  let bestClusterId = null;
  for (const c of candidates) {
    if (!c.embedding || !c.cluster_id) continue;
    const score = cosineSimilarity(candidateEmbedding, c.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestClusterId = c.cluster_id;
    }
  }

  if (bestScore < threshold) {
    return { cluster_id: null, score: bestScore };
  }
  return { cluster_id: bestClusterId, score: bestScore };
}

/**
 * Pure clustering policy: given the candidate's embedding and an array
 * of (already-embedded) cluster members, decide whether to attach to the
 * best-matching cluster or open a new one. Storage and ID generation
 * are the caller's responsibility — this just returns the decision.
 *
 * @param {Object} args
 * @param {Array<number>} args.candidateEmbedding
 * @param {Array<{ embedding: Array<number>, cluster_id: string }>} args.candidates
 * @param {number} [args.threshold]
 * @returns {{ decision: 'attach' | 'create_new', cluster_id: string|null, score: number }}
 */
export function decideClusterAction({ candidateEmbedding, candidates, threshold = 0.82 }) {
  const best = findBestCluster(candidateEmbedding, candidates, threshold);
  if (best.cluster_id) {
    return { decision: 'attach', cluster_id: best.cluster_id, score: best.score };
  }
  return { decision: 'create_new', cluster_id: null, score: best.score };
}
