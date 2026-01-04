/**
 * ALI Scoring Model v1.0
 * 
 * Authoritative scoring implementation based on ALI Scoring Model specification.
 * All calculations are pure functions - same inputs always produce same outputs.
 * 
 * This is measurement infrastructure, not UI logic.
 * Prioritizes longitudinal integrity, determinism, and scale safety.
 */

/**
 * Reverse score negative items
 * @param {number} response - Original response (1-5)
 * @param {boolean} isNegative - Whether this is a negative item
 * @returns {number} - Reversed or original response (1-5)
 */
export function reverseScore(response, isNegative) {
  if (isNegative) {
    return 6 - response;
  }
  return response;
}

/**
 * Normalize response to 0-100 scale
 * @param {number} response - Response value (1-5, already reverse-scored if needed)
 * @returns {number} - Normalized score (0-100)
 */
export function normalizeTo100(response) {
  return ((response - 1) / 4) * 100;
}

/**
 * Calculate pattern score for a single survey
 * Since each survey has exactly one question per pattern, this is a snapshot.
 * 
 * @param {Array} responses - Array of response objects with {question_id, response, is_negative, pattern}
 * @param {string} pattern - Pattern name (e.g., 'clarity', 'trust')
 * @returns {number|null} - Pattern score (0-100) or null if no responses for this pattern
 */
export function calculatePatternScore(responses, pattern) {
  // Filter responses for this pattern
  const patternResponses = responses.filter(r => r.pattern === pattern);
  
  if (patternResponses.length === 0) {
    return null;
  }
  
  // Reverse score and normalize each response
  const normalizedScores = patternResponses.map(r => {
    const reversed = reverseScore(r.response, r.is_negative);
    return normalizeTo100(reversed);
  });
  
  // Return mean
  const sum = normalizedScores.reduce((acc, score) => acc + score, 0);
  return sum / normalizedScores.length;
}

/**
 * Calculate anchor score for a single survey
 * Each survey has 3 anchor questions.
 * 
 * @param {Array} responses - Array of response objects with {question_id, response, is_negative, is_anchor}
 * @returns {number|null} - Anchor score (0-100) or null if no anchor responses
 */
export function calculateAnchorScore(responses) {
  // Filter anchor responses
  const anchorResponses = responses.filter(r => r.is_anchor === true);
  
  if (anchorResponses.length === 0) {
    return null;
  }
  
  // Reverse score and normalize each anchor response
  const normalizedScores = anchorResponses.map(r => {
    const reversed = reverseScore(r.response, r.is_negative);
    return normalizeTo100(reversed);
  });
  
  // Return mean
  const sum = normalizedScores.reduce((acc, score) => acc + score, 0);
  return sum / normalizedScores.length;
}

/**
 * Calculate ALI Overall Score for a single survey
 * Blends patterns (70%) and anchors (30%)
 * 
 * @param {Object} patternScores - Object with pattern names as keys and scores as values
 * @param {number} anchorScore - Anchor score (0-100)
 * @returns {number|null} - ALI score (0-100) or null if insufficient data
 */
export function calculateALIScore(patternScores, anchorScore) {
  // Calculate mean of all pattern scores
  const patternValues = Object.values(patternScores).filter(score => score !== null);
  
  if (patternValues.length === 0 || anchorScore === null) {
    return null;
  }
  
  const patternsMean = patternValues.reduce((acc, score) => acc + score, 0) / patternValues.length;
  
  // Weighted combination: 30% anchors, 70% patterns
  return (0.30 * anchorScore) + (0.70 * patternsMean);
}

/**
 * Calculate rolling score over K surveys (default K=4, ≈1 year)
 * 
 * @param {Array} scores - Array of scores from previous surveys (most recent first)
 * @param {number} windowSize - Number of surveys to include (default 4)
 * @returns {number|null} - Rolling score or null if insufficient data
 */
export function calculateRollingScore(scores, windowSize = 4) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return null;
  }
  
  // Take most recent K scores
  const recentScores = scores.slice(0, windowSize).filter(s => s !== null);
  
  if (recentScores.length === 0) {
    return null;
  }
  
  // Return mean
  const sum = recentScores.reduce((acc, score) => acc + score, 0);
  return sum / recentScores.length;
}

/**
 * Calculate Drift Index (derived trend signal)
 * Detects gradual directional change
 * 
 * @param {Array} aliScores - Array of ALI scores from previous surveys (most recent first)
 * @param {Array} anchorScores - Array of anchor scores (optional, for stabilization)
 * @param {number} windowSize - Number of surveys to include (default 4)
 * @returns {number|null} - Drift index (negative = decline, positive = improvement)
 */
export function calculateDriftIndex(aliScores, anchorScores = null, windowSize = 4) {
  if (!Array.isArray(aliScores) || aliScores.length < 2) {
    return null;
  }
  
  // Calculate quarter-over-quarter deltas
  const deltas = [];
  for (let i = 0; i < Math.min(aliScores.length - 1, windowSize - 1); i++) {
    if (aliScores[i] !== null && aliScores[i + 1] !== null) {
      deltas.push(aliScores[i] - aliScores[i + 1]);
    }
  }
  
  if (deltas.length === 0) {
    return null;
  }
  
  // Average deltas
  const meanDeltaALI = deltas.reduce((acc, delta) => acc + delta, 0) / deltas.length;
  
  // Optional: Stabilize using anchors
  if (anchorScores && Array.isArray(anchorScores) && anchorScores.length >= 2) {
    const anchorDeltas = [];
    for (let i = 0; i < Math.min(anchorScores.length - 1, windowSize - 1); i++) {
      if (anchorScores[i] !== null && anchorScores[i + 1] !== null) {
        anchorDeltas.push(anchorScores[i] - anchorScores[i + 1]);
      }
    }
    
    if (anchorDeltas.length > 0) {
      const meanDeltaAnchor = anchorDeltas.reduce((acc, delta) => acc + delta, 0) / anchorDeltas.length;
      // 50% ALI deltas, 50% anchor deltas
      return (0.5 * meanDeltaALI) + (0.5 * meanDeltaAnchor);
    }
  }
  
  return meanDeltaALI;
}

/**
 * Calculate perception gap between leader and team member responses
 * 
 * @param {number} leaderScore - Score from leader responses
 * @param {number} teamScore - Score from team member responses
 * @returns {number|null} - Gap (positive = leader sees higher, negative = team sees higher)
 */
export function calculatePerceptionGap(leaderScore, teamScore) {
  if (leaderScore === null || teamScore === null) {
    return null;
  }
  
  return leaderScore - teamScore;
}


/**
 * Determine zone classification from rolling ALI score
 * 
 * @param {number} rollingALI - Rolling ALI score (0-100)
 * @returns {string} - 'green' | 'yellow' | 'orange' | 'red' | null
 */
export function classifyZone(rollingALI) {
  if (rollingALI === null) {
    return null;
  }
  
  if (rollingALI >= 75) {
    return 'green';
  } else if (rollingALI >= 60) {
    return 'yellow';
  } else if (rollingALI >= 45) {
    return 'orange';
  }
  
  return 'red';
}

/**
 * Calculate Team Experience Map coordinates
 * X-axis: Clarity (rolling)
 * Y-axis: (Stability + Trust) / 2 (rolling composite)
 * 
 * @param {number} rollingClarity - Rolling Clarity pattern score
 * @param {number} rollingStability - Rolling Stability pattern score
 * @param {number} rollingTrust - Rolling Trust pattern score
 * @returns {Object|null} - {x, y, zone} or null if insufficient data
 */
export function calculateTeamExperienceMapCoordinates(rollingClarity, rollingStability, rollingTrust) {
  if (rollingClarity === null || rollingStability === null || rollingTrust === null) {
    return null;
  }
  
  // X-axis: Clarity (rolling)
  const x = rollingClarity;
  
  // Y-axis: (Stability + Trust) / 2
  const y = (rollingStability + rollingTrust) / 2;
  
  // Determine zone
  let zone;
  if (x >= 70 && y >= 70) {
    zone = 'harmony'; // Green
  } else if (x < 70 && y >= 70) {
    zone = 'strain'; // Yellow
  } else if (x < 70 && y < 70) {
    zone = 'stress'; // Orange
  } else { // x >= 70 && y < 70
    zone = 'hazard'; // Red
  }
  
  return { x, y, zone };
}

/**
 * Calculate Honesty axis for Leadership Profiles
 * Honesty = (PatternRolling(trust) + PatternRolling(communication) + (100 - abs(Gap_Trust))) / 3
 * 
 * @param {number} rollingTrust - Rolling Trust pattern score
 * @param {number} rollingCommunication - Rolling Communication pattern score
 * @param {number} gapTrust - Perception gap for Trust (leader - team)
 * @returns {number|null} - Honesty score (0-100) or null if insufficient data
 */
export function calculateHonestyAxis(rollingTrust, rollingCommunication, gapTrust) {
  if (rollingTrust === null || rollingCommunication === null || gapTrust === null) {
    return null;
  }
  
  const gapComponent = 100 - Math.abs(gapTrust);
  return (rollingTrust + rollingCommunication + gapComponent) / 3;
}

/**
 * Classify Honesty state
 * 
 * @param {number} honestyScore - Honesty axis score (0-100)
 * @returns {string} - 'courageous' | 'selective' | 'protective' | null
 */
export function classifyHonestyState(honestyScore) {
  if (honestyScore === null) {
    return null;
  }
  
  if (honestyScore >= 70) {
    return 'courageous';
  } else if (honestyScore >= 55) {
    return 'selective';
  }
  
  return 'protective';
}

/**
 * Classify Clarity state
 * 
 * @param {number} clarityLevel - Rolling Clarity pattern score
 * @param {number} clarityVariance - Standard deviation of Clarity scores over last 4 surveys
 * @returns {string} - 'high' | 'unstable' | 'ambiguous' | null
 */
export function classifyClarityState(clarityLevel, clarityVariance) {
  if (clarityLevel === null) {
    return null;
  }
  
  // High Clarity: Level >= 70 AND Variance < 8
  if (clarityLevel >= 70 && (clarityVariance === null || clarityVariance < 8)) {
    return 'high';
  }
  
  // Unstable Clarity: Level >= 60 AND Variance >= 8
  if (clarityLevel >= 60 && clarityVariance !== null && clarityVariance >= 8) {
    return 'unstable';
  }
  
  // Ambiguous Clarity: Level < 60
  return 'ambiguous';
}

/**
 * Determine Leadership Profile
 * Based on Honesty state and Clarity state
 * 
 * @param {string} honestyState - 'courageous' | 'selective' | 'protective'
 * @param {string} clarityState - 'high' | 'unstable' | 'ambiguous'
 * @param {number} surveyCount - Number of surveys available
 * @returns {string|null} - Profile name or null if insufficient data
 */
export function determineLeadershipProfile(honestyState, clarityState, surveyCount = 0) {
  // Need at least 3 surveys for profile determination
  if (surveyCount < 3) {
    return 'profile_forming';
  }
  
  if (!honestyState || !clarityState) {
    return null;
  }
  
  // Profile Matrix (LOCKED)
  // Protective honesty always maps to Operator (no exceptions)
  if (honestyState === 'protective') {
    return 'operator';
  }
  
  // Matrix lookup
  const profileMatrix = {
    courageous: {
      high: 'guardian',
      unstable: 'aspirer',
      ambiguous: 'producer_leader'
    },
    selective: {
      high: 'protector',
      unstable: 'stabilizer',
      ambiguous: 'operator'
    }
  };
  
  return profileMatrix[honestyState]?.[clarityState] || null;
}

/**
 * Calculate variance (standard deviation) for a set of scores
 * Used for Clarity variance calculation
 * 
 * @param {Array} scores - Array of scores
 * @returns {number|null} - Variance (standard deviation) or null if insufficient data
 */
export function calculateVariance(scores) {
  if (!Array.isArray(scores) || scores.length < 2) {
    return null;
  }
  
  const validScores = scores.filter(s => s !== null);
  
  if (validScores.length < 2) {
    return null;
  }
  
  const mean = validScores.reduce((acc, score) => acc + score, 0) / validScores.length;
  const variance = validScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / validScores.length;
  
  return Math.sqrt(variance);
}

/**
 * Classify gap severity for Leadership Mirror
 * 
 * @param {number} gap - Perception gap value (leader - team)
 * @returns {string} - 'neutral' | 'caution' | 'critical'
 */
export function classifyGapSeverity(gap) {
  if (gap === null) {
    return 'neutral';
  }
  
  const absGap = Math.abs(gap);
  
  if (absGap >= 15) {
    return 'critical';
  } else if (absGap >= 8) {
    return 'caution';
  }
  
  return 'neutral';
}

/**
 * Check if data meets minimum N requirements
 * 
 * @param {number} responseCount - Number of responses
 * @param {string} level - 'team' or 'org'
 * @returns {boolean} - Whether minimum N is met
 */
export function meetsMinimumN(responseCount, level = 'org') {
  if (level === 'team') {
    return responseCount >= 5;
  }
  
  // Org level (can be relaxed for SMBs)
  return responseCount >= 10;
}

/**
 * Calculate standard deviation for a set of scores
 * 
 * @param {Array} scores - Array of scores
 * @returns {number|null} - Standard deviation or null if insufficient data
 */
export function calculateStandardDeviation(scores) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return null;
  }
  
  const validScores = scores.filter(s => s !== null);
  
  if (validScores.length === 0) {
    return null;
  }
  
  const mean = validScores.reduce((acc, score) => acc + score, 0) / validScores.length;
  const variance = validScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / validScores.length;
  
  return Math.sqrt(variance);
}

/**
 * Main scoring function - calculates all scores for a survey
 * 
 * @param {Object} params - Scoring parameters
 * @param {Array} params.responses - All responses for this survey
 * @param {Array} params.historicalScores - Historical scores from previous surveys (for rolling)
 * @param {string} params.role - 'leader' | 'team_member' | 'overall' (optional filter)
 * @returns {Object} - Complete score object matching API shape
 */
export function calculateAllScores({ responses, historicalScores = [], role = 'overall' }) {
  // Filter by role if specified
  let filteredResponses = responses;
  if (role === 'leader') {
    filteredResponses = responses.filter(r => r.role === 'leader');
  } else if (role === 'team_member') {
    filteredResponses = responses.filter(r => r.role === 'team_member');
  }
  
  // Calculate pattern scores
  const patterns = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];
  const patternScores = {};
  
  patterns.forEach(pattern => {
    patternScores[pattern] = calculatePatternScore(filteredResponses, pattern);
  });
  
  // Calculate anchor score
  const anchorScore = calculateAnchorScore(filteredResponses);
  
  // Calculate ALI score
  const aliScore = calculateALIScore(patternScores, anchorScore);
  
  // Calculate rolling scores (if historical data available)
  const rollingALI = historicalScores.length > 0 
    ? calculateRollingScore([aliScore, ...historicalScores.map(h => h.ali?.current)], 4)
    : null;
  
  const rollingAnchor = historicalScores.length > 0
    ? calculateRollingScore([anchorScore, ...historicalScores.map(h => h.anchors?.current)], 4)
    : null;
  
  const rollingPatterns = {};
  patterns.forEach(pattern => {
    if (historicalScores.length > 0) {
      const historicalPatternScores = historicalScores.map(h => h.patterns?.[pattern]?.current).filter(s => s !== null);
      rollingPatterns[pattern] = calculateRollingScore([patternScores[pattern], ...historicalPatternScores], 4);
    } else {
      rollingPatterns[pattern] = null;
    }
  });
  
  // Calculate drift index
  const historicalALIScores = historicalScores.map(h => h.ali?.current).filter(s => s !== null);
  const historicalAnchorScores = historicalScores.map(h => h.anchors?.current).filter(s => s !== null);
  const driftIndex = calculateDriftIndex([aliScore, ...historicalALIScores], [anchorScore, ...historicalAnchorScores]);
  
  // Determine zone
  const zone = classifyZone(rollingALI);
  
  // Calculate data quality metrics
  const responseCount = filteredResponses.length;
  const meetsMinimum = meetsMinimumN(responseCount, 'org');
  const allScores = Object.values(patternScores).filter(s => s !== null);
  const standardDeviation = calculateStandardDeviation(allScores);
  
  // Return API shape
  return {
    scores: {
      ali: {
        current: aliScore,
        rolling: rollingALI,
        zone: zone
      },
      anchors: {
        current: anchorScore,
        rolling: rollingAnchor
      },
      patterns: Object.keys(patternScores).reduce((acc, pattern) => {
        acc[pattern] = {
          current: patternScores[pattern],
          rolling: rollingPatterns[pattern]
        };
        return acc;
      }, {})
    },
    drift: {
      delta_ali: historicalALIScores.length > 0 ? aliScore - historicalALIScores[0] : null,
      drift_index: driftIndex
    },
    data_quality: {
      meets_minimum_n: meetsMinimum,
      response_count: responseCount,
      standard_deviation: standardDeviation
    }
  };
}

