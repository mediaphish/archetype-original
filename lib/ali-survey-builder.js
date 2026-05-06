/**
 * ALI Survey Builder - Deterministic Survey Generation
 * 
 * Core principles:
 * - Deterministic: Same seed always produces same survey
 * - System-only: No human question selection
 * - Immutable: Surveys never change once generated
 * - Constraint-enforced: 3 anchors, 7 patterns, 2-4 negatives, 10 total
 */

import { createHash } from 'crypto';
import seedrandom from 'seedrandom';
import { CONDITION_KEYS } from './ali-conditions.js';

/**
 * Generate deterministic seed from client_id, survey_index, and instrument_version
 * 
 * @param {string} clientId - Company UUID
 * @param {string} surveyIndex - "S1", "S2", "S3", etc.
 * @param {string} instrumentVersion - "v1.0", "v1.1", etc.
 * @returns {string} SHA256 hash of the seed components
 */
export function generateSeed(clientId, surveyIndex, instrumentVersion = 'v1.0') {
  const seedString = `${clientId}|${surveyIndex}|${instrumentVersion}`;
  return createHash('sha256').update(seedString).digest('hex');
}

/**
 * Deterministic selection from array using seed-based PRNG
 * 
 * @param {Array} array - Array to select from
 * @param {string} seed - Seed string for PRNG
 * @returns {*} Selected element
 */
export function selectDeterministic(array, seed) {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  
  const rng = seedrandom(seed);
  const index = Math.floor(rng() * array.length);
  return array[index];
}

/**
 * Deterministic shuffle using seed-based PRNG
 * 
 * @param {Array} array - Array to shuffle
 * @param {string} seed - Seed string for PRNG
 * @returns {Array} Shuffled array (new array, original unchanged)
 */
export function deterministicShuffle(array, seed) {
  const shuffled = [...array];
  const rng = seedrandom(seed);
  
  // Fisher-Yates shuffle with seed-based PRNG
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Validate survey composition constraints
 * 
 * @param {Array} questions - Array of question objects
 * @returns {Object} Validation result with isValid and errors
 */
export function validateSurveyComposition(questions) {
  const errors = [];
  
  // Count composition
  const anchors = questions.filter(q => q.is_anchor);
  const patterns = new Set(questions.filter(q => !q.is_anchor).map(q => q.pattern));
  const negatives = questions.filter(q => q.is_negative);
  const total = questions.length;
  
  // Validate anchor count
  if (anchors.length !== 3) {
    errors.push(`Expected exactly 3 anchors, found ${anchors.length}`);
  }
  
  // Validate pattern count (excluding anchors)
  if (patterns.size !== 7) {
    errors.push(`Expected questions from all 7 patterns, found ${patterns.size}`);
  }
  
  // Validate negative item count
  if (negatives.length < 2 || negatives.length > 4) {
    errors.push(`Expected 2-4 negative items, found ${negatives.length}`);
  }
  
  // Validate total count
  if (total !== 10) {
    errors.push(`Expected exactly 10 questions, found ${total}`);
  }
  
  // Validate no duplicates
  const stableIds = questions.map(q => q.stable_id);
  const uniqueIds = new Set(stableIds);
  if (stableIds.length !== uniqueIds.size) {
    errors.push('Duplicate questions found in survey');
  }
  
  // Validate all questions are active
  const inactiveQuestions = questions.filter(q => q.status !== 'active');
  if (inactiveQuestions.length > 0) {
    errors.push(`Found ${inactiveQuestions.length} inactive questions`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    composition: {
      anchorCount: anchors.length,
      patternCount: patterns.size,
      negativeCount: negatives.length,
      totalCount: total
    }
  };
}

/**
 * Select anchor questions deterministically
 * 
 * @param {Array} questionBank - All active questions
 * @param {string} seed - Generation seed
 * @returns {Array} Array of 3 anchor questions
 */
export function selectAnchors(questionBank, seed) {
  const leaderAnchors = questionBank.filter(q => 
    q.is_anchor && q.role === 'leader' && q.status === 'active'
  );
  const teamAnchors = questionBank.filter(q => 
    q.is_anchor && q.role === 'team_member' && q.status === 'active'
  );
  const allAnchors = questionBank.filter(q => 
    q.is_anchor && q.status === 'active'
  );
  
  // Validate anchor availability
  if (leaderAnchors.length === 0) {
    throw new Error('No leader anchor questions available in question bank');
  }
  if (teamAnchors.length === 0) {
    throw new Error('No team anchor questions available in question bank');
  }
  if (allAnchors.length < 3) {
    throw new Error(`Insufficient anchor questions: need 3, found ${allAnchors.length}`);
  }
  
  // Select deterministically
  const anchor1 = selectDeterministic(leaderAnchors, seed + '|anchor|leader');
  const anchor2 = selectDeterministic(teamAnchors, seed + '|anchor|team');
  
  // For shared anchor, exclude already selected
  const remainingAnchors = allAnchors.filter(a => 
    a.stable_id !== anchor1.stable_id && a.stable_id !== anchor2.stable_id
  );
  const anchor3 = selectDeterministic(remainingAnchors, seed + '|anchor|shared');
  
  return [anchor1, anchor2, anchor3];
}

/**
 * Select pattern questions (one per pattern)
 * 
 * @param {Array} questionBank - All active questions
 * @param {Array} selectedAnchors - Already selected anchor questions
 * @param {string} seed - Generation seed
 * @param {string} surveyIndex - Survey index for seed variation
 * @returns {Array} Array of 7 pattern questions
 */
export function selectPatternQuestions(questionBank, selectedAnchors, seed, surveyIndex) {
  const patterns = [...CONDITION_KEYS];

  const selectedStableIds = new Set(selectedAnchors.map(a => a.stable_id));
  const patternQuestions = [];
  
  for (const pattern of patterns) {
    // Get candidates for this pattern (excluding anchors)
    const candidates = questionBank.filter(q =>
      q.pattern === pattern &&
      !q.is_anchor &&
      q.status === 'active' &&
      !selectedStableIds.has(q.stable_id)
    );
    
    if (candidates.length === 0) {
      throw new Error(`No questions available for pattern: ${pattern}`);
    }
    
    // Deterministic selection with pattern-specific seed
    const selected = selectDeterministic(
      candidates,
      seed + `|pattern|${pattern}|${surveyIndex}`
    );
    
    patternQuestions.push(selected);
    selectedStableIds.add(selected.stable_id);
  }
  
  return patternQuestions;
}

/**
 * Group an array of questions into constructs.
 * Returns a Map of construct_id -> { construct_id, pattern, is_anchor, leader, team_member, items[] }
 *
 * Items missing construct_id are skipped (v1.x items in a v2.0 build are not selectable).
 */
export function groupByConstruct(questionBank) {
  const groups = new Map();
  for (const q of questionBank) {
    if (!q.construct_id || q.status !== 'active') continue;
    if (!groups.has(q.construct_id)) {
      groups.set(q.construct_id, {
        construct_id: q.construct_id,
        pattern: q.pattern,
        is_anchor: !!q.is_anchor,
        items: [],
        leader: null,
        team_member: null,
      });
    }
    const g = groups.get(q.construct_id);
    g.items.push(q);
    if (q.role === 'leader' && !g.leader) g.leader = q;
    if (q.role === 'team_member' && !g.team_member) g.team_member = q;
    g.is_anchor = g.is_anchor || !!q.is_anchor;
  }
  return groups;
}

/**
 * Filter to only paired constructs (leader + team stem present).
 */
export function pairedConstructs(constructMap) {
  const paired = [];
  for (const g of constructMap.values()) {
    if (g.leader && g.team_member) paired.push(g);
  }
  return paired;
}

/**
 * Validate v2.0 paired-construct survey composition.
 *
 * @param {Array} constructs - Array of construct group objects with leader+team_member
 * @returns {Object} Validation result with isValid and errors
 */
export function validateConstructComposition(constructs) {
  const errors = [];

  const anchors = constructs.filter((c) => c.is_anchor);
  const nonAnchorPatterns = new Set(constructs.filter((c) => !c.is_anchor).map((c) => c.pattern));
  const negatives = constructs.filter(
    (c) => (c.leader && c.leader.is_negative) || (c.team_member && c.team_member.is_negative)
  );
  const total = constructs.length;

  if (anchors.length !== 3) errors.push(`Expected exactly 3 anchor constructs, found ${anchors.length}`);
  if (nonAnchorPatterns.size !== 7)
    errors.push(`Expected questions from all 7 patterns (excluding anchors), found ${nonAnchorPatterns.size}`);
  if (total !== 10) errors.push(`Expected exactly 10 constructs, found ${total}`);
  if (negatives.length < 2 || negatives.length > 4)
    errors.push(`Expected 2–4 constructs with at least one negative item, found ${negatives.length}`);

  for (const c of constructs) {
    if (!c.leader || !c.team_member) {
      errors.push(`Construct ${c.construct_id} missing role pair`);
      continue;
    }
    const leaderScale = c.leader.response_scale || '1_5_likert';
    const teamScale = c.team_member.response_scale || '1_5_likert';
    if (leaderScale !== teamScale) {
      errors.push(
        `Construct ${c.construct_id} has mismatched response scales (leader=${leaderScale}, team=${teamScale})`
      );
    }
  }

  const constructIds = constructs.map((c) => c.construct_id);
  if (new Set(constructIds).size !== constructIds.length) {
    errors.push('Duplicate constructs found in survey');
  }

  return {
    isValid: errors.length === 0,
    errors,
    composition: {
      anchorCount: anchors.length,
      patternCount: nonAnchorPatterns.size,
      negativeCount: negatives.length,
      totalCount: total,
    },
  };
}

/**
 * Select anchor constructs deterministically (v2.0).
 *
 * Picks 3 anchor constructs that are paired (leader + team_member). The
 * deterministic seed mirrors the v1.x anchor-selection convention so a
 * given client/survey_index combination produces a stable result.
 */
export function selectAnchorConstructs(paired, seed) {
  const anchors = paired.filter((c) => c.is_anchor);
  if (anchors.length < 3) {
    throw new Error(`Insufficient anchor constructs available: need 3 paired anchors, found ${anchors.length}`);
  }

  const sortedAnchors = anchors.slice().sort((a, b) => a.construct_id.localeCompare(b.construct_id));

  const a1 = selectDeterministic(sortedAnchors, seed + '|anchor|1');
  const remaining1 = sortedAnchors.filter((c) => c.construct_id !== a1.construct_id);
  const a2 = selectDeterministic(remaining1, seed + '|anchor|2');
  const remaining2 = remaining1.filter((c) => c.construct_id !== a2.construct_id);
  const a3 = selectDeterministic(remaining2, seed + '|anchor|3');

  return [a1, a2, a3];
}

/**
 * Select one paired construct per pattern (excluding anchors), 7 in total.
 */
export function selectPatternConstructs(paired, selectedAnchors, seed, surveyIndex) {
  const patterns = [...CONDITION_KEYS];

  const selectedIds = new Set(selectedAnchors.map((a) => a.construct_id));
  const result = [];

  for (const pattern of patterns) {
    const candidates = paired
      .filter((c) => c.pattern === pattern && !c.is_anchor && !selectedIds.has(c.construct_id))
      .sort((a, b) => a.construct_id.localeCompare(b.construct_id));

    if (candidates.length === 0) {
      throw new Error(`No paired constructs available for pattern: ${pattern}`);
    }

    const picked = selectDeterministic(candidates, seed + `|construct|${pattern}|${surveyIndex}`);
    result.push(picked);
    selectedIds.add(picked.construct_id);
  }

  return result;
}

/**
 * Build a paired-construct survey (v2.0 paired architecture).
 *
 * Returns an object with:
 *   - constructs: Array of 10 construct objects, deterministically ordered (post-shuffle)
 *   - questions: Flat array of every leader+team_member stem actually carried by the
 *     deployment (so existing snapshot fields like `question_stable_ids` continue to work)
 *   - validation: Composition validation result
 *
 * @param {Array} questionBank - All active questions for the target instrument_version
 * @param {string} clientId
 * @param {string} surveyIndex - "S1", "S2", etc.
 * @param {string} instrumentVersion - typically "v2.0"
 * @param {number} maxRetries
 */
export function buildPairedSurvey(
  questionBank,
  clientId,
  surveyIndex,
  instrumentVersion = 'v2.0',
  maxRetries = 3
) {
  const baseSeed = generateSeed(clientId, surveyIndex, instrumentVersion);
  const groups = groupByConstruct(questionBank);
  const paired = pairedConstructs(groups);

  if (paired.length < 10) {
    throw new Error(
      `Question bank has only ${paired.length} paired constructs; need at least 10 to build a v2.0 survey.`
    );
  }

  for (let retry = 0; retry <= maxRetries; retry++) {
    const seed = retry === 0 ? baseSeed : baseSeed + `|retry|${retry}`;

    try {
      const anchors = selectAnchorConstructs(paired, seed);
      const patternConstructs = selectPatternConstructs(paired, anchors, seed, surveyIndex);
      const all = [...anchors, ...patternConstructs];

      const validation = validateConstructComposition(all);
      if (!validation.isValid) {
        if (retry < maxRetries) continue;
        throw new Error(
          `Paired survey composition validation failed after ${maxRetries + 1} attempts: ` +
            validation.errors.join('; ')
        );
      }

      const orderedConstructs = deterministicShuffle(all, seed + '|shuffle|construct');
      const questions = [];
      for (const c of orderedConstructs) {
        questions.push(c.leader);
        questions.push(c.team_member);
      }

      return {
        constructs: orderedConstructs,
        questions,
        seed: baseSeed,
        retryAttempt: retry,
        validation,
      };
    } catch (error) {
      if (retry < maxRetries) continue;
      throw error;
    }
  }

  throw new Error('Paired survey generation failed: unexpected error');
}

/**
 * Build survey with retry logic for constraint violations
 * 
 * @param {Array} questionBank - All active questions
 * @param {string} clientId - Company UUID
 * @param {string} surveyIndex - "S1", "S2", etc.
 * @param {string} instrumentVersion - "v1.0", etc.
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Object} Survey composition with questions and validation
 */
export function buildSurvey(questionBank, clientId, surveyIndex, instrumentVersion = 'v1.0', maxRetries = 3) {
  const baseSeed = generateSeed(clientId, surveyIndex, instrumentVersion);
  
  for (let retry = 0; retry <= maxRetries; retry++) {
    const seed = retry === 0 ? baseSeed : baseSeed + `|retry|${retry}`;
    
    try {
      // Step 1: Select anchors
      const anchors = selectAnchors(questionBank, seed);
      
      // Step 2: Select pattern questions
      const patternQuestions = selectPatternQuestions(questionBank, anchors, seed, surveyIndex);
      
      // Step 3: Combine all questions
      const allQuestions = [...anchors, ...patternQuestions];
      
      // Step 4: Validate composition
      const validation = validateSurveyComposition(allQuestions);
      
      if (!validation.isValid) {
        if (retry < maxRetries) {
          // Retry with different seed variation
          continue;
        } else {
          // Max retries exceeded
          throw new Error(
            `Survey composition validation failed after ${maxRetries + 1} attempts: ` +
            validation.errors.join('; ')
          );
        }
      }
      
      // Step 5: Deterministic shuffle
      const shuffledQuestions = deterministicShuffle(allQuestions, seed + '|shuffle');
      
      return {
        questions: shuffledQuestions,
        seed: baseSeed,
        retryAttempt: retry,
        validation
      };
      
    } catch (error) {
      if (retry < maxRetries) {
        continue;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Survey generation failed: unexpected error');
}

