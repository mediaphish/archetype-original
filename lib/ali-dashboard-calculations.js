/**
 * ALI Dashboard Calculations
 * 
 * Complete dashboard calculation functions based on locked specification.
 * All calculations use rolling scores only (never snapshot).
 */

import {
  calculateRollingScore,
  calculatePerceptionGap,
  calculateTeamExperienceMapCoordinates,
  calculateHonestyAxis,
  classifyHonestyState,
  classifyClarityState,
  determineLeadershipProfile,
  calculateVariance,
  classifyGapSeverity
} from './ali-scoring.js';

/**
 * Calculate three core scores (Alignment, Stability, Clarity)
 * These are explicitly pattern scores (rolling), no composites.
 * 
 * @param {Object} rollingPatternScores - Object with pattern names and rolling scores
 * @returns {Object} - {alignment, stability, clarity}
 */
export function calculateThreeCoreScores(rollingPatternScores) {
  return {
    alignment: rollingPatternScores.alignment || null,
    stability: rollingPatternScores.stability || null,
    clarity: rollingPatternScores.clarity || null
  };
}

/**
 * Calculate Leadership Profile
 * Requires team responses only (no leader self-report)
 * 
 * @param {Object} params - Calculation parameters
 * @param {Object} params.rollingPatternScores - Rolling pattern scores (team only)
 * @param {Object} params.gaps - Perception gaps (leader - team)
 * @param {Array} params.historicalClarityScores - Historical Clarity scores for variance
 * @param {number} params.surveyCount - Number of surveys available
 * @returns {Object} - Profile information
 */
export function calculateLeadershipProfile({ rollingPatternScores, gaps, historicalClarityScores = [], surveyCount = 0 }) {
  // Calculate Honesty axis
  const honestyScore = calculateHonestyAxis(
    rollingPatternScores.trust,
    rollingPatternScores.communication,
    gaps.trust
  );
  
  const honestyState = classifyHonestyState(honestyScore);
  
  // Calculate Clarity state
  const clarityLevel = rollingPatternScores.clarity;
  const clarityVariance = calculateVariance(historicalClarityScores);
  const clarityState = classifyClarityState(clarityLevel, clarityVariance);
  
  // Determine profile
  const profile = determineLeadershipProfile(honestyState, clarityState, surveyCount);
  
  return {
    profile,
    honesty: {
      score: honestyScore,
      state: honestyState
    },
    clarity: {
      level: clarityLevel,
      variance: clarityVariance,
      state: clarityState
    }
  };
}

/**
 * Calculate Leadership Mirror gaps
 * Always gap-based, always leader vs team
 * 
 * @param {Object} leaderScores - Scores from leader responses
 * @param {Object} teamScores - Scores from team member responses
 * @returns {Object} - Gap analysis with severity
 */
export function calculateLeadershipMirror(leaderScores, teamScores) {
  // Required scores: ALI Overall, Alignment, Stability, Clarity
  const gaps = {
    ali: calculatePerceptionGap(leaderScores.ali, teamScores.ali),
    alignment: calculatePerceptionGap(leaderScores.alignment, teamScores.alignment),
    stability: calculatePerceptionGap(leaderScores.stability, teamScores.stability),
    clarity: calculatePerceptionGap(leaderScores.clarity, teamScores.clarity)
  };
  
  // Classify severity for each gap
  const severity = {
    ali: classifyGapSeverity(gaps.ali),
    alignment: classifyGapSeverity(gaps.alignment),
    stability: classifyGapSeverity(gaps.stability),
    clarity: classifyGapSeverity(gaps.clarity)
  };
  
  return {
    gaps,
    severity,
    leaderScores,
    teamScores
  };
}

/**
 * Complete dashboard calculation
 * Combines all dashboard calculations using rolling scores only
 * 
 * @param {Object} params - Calculation parameters
 * @param {Object} params.currentScores - Current survey scores (for reference)
 * @param {Object} params.rollingScores - Rolling scores (4-survey window)
 * @param {Object} params.leaderScores - Leader response scores
 * @param {Object} params.teamScores - Team member response scores
 * @param {Array} params.historicalClarityScores - Historical Clarity scores for variance
 * @param {number} params.surveyCount - Number of surveys available
 * @returns {Object} - Complete dashboard data
 */
export function calculateDashboardData({
  currentScores,
  rollingScores,
  leaderScores,
  teamScores,
  historicalClarityScores = [],
  surveyCount = 0
}) {
  // Three core scores (rolling pattern scores only)
  const coreScores = calculateThreeCoreScores(rollingScores.patterns);
  
  // Team Experience Map coordinates
  const experienceMap = calculateTeamExperienceMapCoordinates(
    rollingScores.patterns.clarity,
    rollingScores.patterns.stability,
    rollingScores.patterns.trust
  );
  
  // Calculate gaps for Leadership Mirror
  const gaps = {
    ali: calculatePerceptionGap(leaderScores.ali?.rolling, teamScores.ali?.rolling),
    alignment: calculatePerceptionGap(leaderScores.patterns?.alignment?.rolling, teamScores.patterns?.alignment?.rolling),
    stability: calculatePerceptionGap(leaderScores.patterns?.stability?.rolling, teamScores.patterns?.stability?.rolling),
    clarity: calculatePerceptionGap(leaderScores.patterns?.clarity?.rolling, teamScores.patterns?.clarity?.rolling),
    trust: calculatePerceptionGap(leaderScores.patterns?.trust?.rolling, teamScores.patterns?.trust?.rolling)
  };
  
  // Leadership Profile
  const leadershipProfile = calculateLeadershipProfile({
    rollingPatternScores: rollingScores.patterns,
    gaps: {
      trust: gaps.trust
    },
    historicalClarityScores,
    surveyCount
  });
  
  // Leadership Mirror
  const leadershipMirror = calculateLeadershipMirror(
    {
      ali: leaderScores.ali?.rolling,
      alignment: leaderScores.patterns?.alignment?.rolling,
      stability: leaderScores.patterns?.stability?.rolling,
      clarity: leaderScores.patterns?.clarity?.rolling
    },
    {
      ali: teamScores.ali?.rolling,
      alignment: teamScores.patterns?.alignment?.rolling,
      stability: teamScores.patterns?.stability?.rolling,
      clarity: teamScores.patterns?.clarity?.rolling
    }
  );
  
  return {
    coreScores,
    experienceMap,
    leadershipProfile,
    leadershipMirror,
    rollingScores,
    gaps
  };
}

