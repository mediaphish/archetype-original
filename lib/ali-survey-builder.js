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
  const patterns = [
    'clarity',
    'consistency',
    'trust',
    'communication',
    'alignment',
    'stability',
    'leadership_drift'
  ];
  
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

