/**
 * ALI Dashboard Data
 * 
 * Get complete dashboard data with all scoring calculations
 * 
 * GET /api/ali/dashboard?companyId=xxx
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import {
  calculatePatternScore,
  calculateAnchorScore,
  calculateALIScore,
  calculateRollingScore,
  calculateDriftIndex,
  classifyZone,
  meetsMinimumN,
  calculateStandardDeviation,
  calculatePerceptionGap,
  classifyGapSeverity
} from '../../lib/ali-scoring.js';
import {
  calculateThreeCoreScores,
  calculateLeadershipProfile,
  calculateLeadershipMirror,
  calculateTeamExperienceMapCoordinates
} from '../../lib/ali-dashboard-calculations.js';

/**
 * Transform response data from database format to scoring function format
 * 
 * @param {Object} responseData - Response from ali_survey_responses.responses (JSON)
 * @param {Object} questionBank - Map of stable_id to question metadata
 * @param {string} role - 'leader' | 'team_member' (from contact or response metadata)
 * @returns {Array} Array of response objects for scoring functions
 */
function transformResponsesForScoring(responseData, questionBank, role) {
  const transformed = [];
  
  // responseData is a JSON object: { "Q-CLARITY-001": 4, "Q-TRUST-002": 5, ... }
  for (const [stableId, responseValue] of Object.entries(responseData)) {
    const question = questionBank[stableId];
    if (!question || !responseValue || responseValue < 1 || responseValue > 5) {
      continue; // Skip invalid questions
    }
    
    transformed.push({
      question_id: stableId,
      response: responseValue,
      is_negative: question.is_negative || false,
      is_anchor: question.is_anchor || false,
      pattern: question.pattern,
      role: role
    });
  }
  
  return transformed;
}

/**
 * Calculate scores for a set of responses
 */
function calculateScoresForResponses(allResponses, questionBank, historicalScores = []) {
  // Calculate pattern scores
  const patterns = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];
  const patternScores = {};
  
  patterns.forEach(pattern => {
    patternScores[pattern] = calculatePatternScore(allResponses, pattern);
  });
  
  // Calculate anchor score
  const anchorScore = calculateAnchorScore(allResponses);
  
  // Calculate ALI score
  const aliScore = calculateALIScore(patternScores, anchorScore);
  
  // Calculate rolling scores if historical data available
  const historicalALIScores = historicalScores.map(h => h.ali?.current).filter(s => s !== null && s !== undefined);
  const historicalAnchorScores = historicalScores.map(h => h.anchors?.current).filter(s => s !== null && s !== undefined);
  
  const rollingALI = historicalALIScores.length >= 3 
    ? calculateRollingScore([aliScore, ...historicalALIScores].slice(0, 4), 4)
    : null;
  
  const rollingAnchor = historicalAnchorScores.length >= 3
    ? calculateRollingScore([anchorScore, ...historicalAnchorScores].slice(0, 4), 4)
    : null;
  
  const rollingPatterns = {};
  patterns.forEach(pattern => {
    const historicalPatternScores = historicalScores.map(h => h.patterns?.[pattern]?.current).filter(s => s !== null && s !== undefined);
    if (historicalPatternScores.length >= 3) {
      rollingPatterns[pattern] = calculateRollingScore([patternScores[pattern], ...historicalPatternScores].slice(0, 4), 4);
    } else {
      rollingPatterns[pattern] = null;
    }
  });
  
  // Calculate drift index
  const driftIndex = historicalALIScores.length >= 3
    ? calculateDriftIndex([aliScore, ...historicalALIScores].slice(0, 4), [anchorScore, ...historicalAnchorScores].slice(0, 4))
    : null;
  
  // Calculate delta (qoq_delta)
  const deltaALI = historicalALIScores.length > 0 ? aliScore - historicalALIScores[0] : null;
  
  // Determine zone (use rolling if available, otherwise current)
  const zoneScore = rollingALI !== null ? rollingALI : aliScore;
  const zone = classifyZone(zoneScore);
  
  return {
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
    }, {}),
    drift: {
      delta_ali: deltaALI,
      drift_index: driftIndex
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Get company info
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get all deployments for this company (active or completed - we'll process responses from any)
    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select(`
        id,
        survey_index,
        snapshot_id,
        deployed_at,
        closes_at,
        status
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'completed'])
      .order('deployed_at', { ascending: true });

    if (deploymentsError) {
      console.error('Error fetching deployments:', deploymentsError);
      return res.status(500).json({ error: 'Failed to fetch survey deployments' });
    }

    if (!deployments || deployments.length === 0) {
      // Return empty dashboard structure
      return res.status(200).json({
        company: {
          id: company.id,
          name: company.name,
          subscription_status: 'active' // Default, should come from billing system
        },
        scores: {
          ali: { current: null, rolling: null, zone: null },
          anchors: { current: null, rolling: null },
          patterns: {}
        },
        coreScores: {
          alignment: null,
          stability: null,
          clarity: null
        },
        experienceMap: {
          x: null,
          y: null,
          zone: null
        },
        leadershipProfile: {
          profile: 'profile_forming',
          honesty: { score: null, state: null, gap_component_used: false },
          clarity: { level: null, stddev: null, state: null }
        },
        leadershipMirror: {
          gaps: { ali: null, alignment: null, stability: null, clarity: null },
          severity: { ali: 'neutral', alignment: 'neutral', stability: 'neutral', clarity: 'neutral' },
          leaderScores: { ali: null, alignment: null, stability: null, clarity: null },
          teamScores: { ali: null, alignment: null, stability: null, clarity: null }
        },
        drift: {
          delta_ali: null,
          drift_index: null
        },
        trajectory: {
          value: null,
          direction: 'stable',
          magnitude: 0,
          method: 'qoq_delta'
        },
        responseCounts: {
          overall: 0,
          leader: 0,
          team_member: 0
        },
        dataQuality: {
          meets_minimum_n: false,
          meets_minimum_n_team: false,
          meets_minimum_n_org: false,
          response_count: 0,
          data_quality_banner: false
        },
        surveys: [],
        historicalTrends: []
      });
    }

    // Load question bank (cache this in production)
    const { data: questionBankData, error: qbError } = await supabaseAdmin
      .from('ali_question_bank')
      .select('stable_id, pattern, is_negative, is_anchor, role')
      .eq('status', 'active');

    if (qbError || !questionBankData) {
      return res.status(500).json({ error: 'Failed to load question bank' });
    }

    // Create question bank map for quick lookup
    const questionBank = {};
    questionBankData.forEach(q => {
      questionBank[q.stable_id] = {
        pattern: q.pattern,
        is_negative: q.is_negative,
        is_anchor: q.is_anchor,
        role: q.role
      };
    });

    // Get all responses for completed deployments
    const deploymentIds = deployments.map(d => d.id);
    const { data: allResponses, error: responsesError } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('id, deployment_id, responses, completed_at')
      .in('deployment_id', deploymentIds)
      .order('completed_at', { ascending: true });

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return res.status(500).json({ error: 'Failed to fetch survey responses' });
    }

    // Count responses by role (we need to determine role from question bank or contact data)
    // For now, we'll use a heuristic: if response has leader-role questions, it's a leader
    // This is a simplification - in production, you'd track role in the response or contact
    let leaderCount = 0;
    let teamMemberCount = 0;
    const leaderResponses = [];
    const teamMemberResponses = [];
    const allTransformedResponses = [];

    // Group responses by deployment for historical tracking
    const responsesByDeployment = {};
    deployments.forEach(deployment => {
      responsesByDeployment[deployment.id] = [];
    });

    allResponses?.forEach(response => {
      responsesByDeployment[response.deployment_id]?.push(response);
    });

    // Process each deployment's responses
    const historicalScores = [];
    const historicalClarityScores = [];

    for (const deployment of deployments) {
      const deploymentResponses = responsesByDeployment[deployment.id] || [];
      
      if (deploymentResponses.length === 0) continue;

      // Transform all responses for this deployment
      const transformedForDeployment = [];
      deploymentResponses.forEach(response => {
        // Determine role heuristically (check if response contains leader-role questions)
        // This is a simplification - ideally role would be stored in response or contact
        let isLeader = false;
        for (const stableId of Object.keys(response.responses || {})) {
          const question = questionBank[stableId];
          if (question && question.role === 'leader') {
            isLeader = true;
            break;
          }
        }

        const transformed = transformResponsesForScoring(
          response.responses,
          questionBank,
          isLeader ? 'leader' : 'team_member'
        );

        transformedForDeployment.push(...transformed);
        
        if (isLeader) {
          leaderCount++;
          leaderResponses.push(...transformed);
        } else {
          teamMemberCount++;
          teamMemberResponses.push(...transformed);
        }
        
        allTransformedResponses.push(...transformed);
      });

      // Calculate scores for this deployment
      const deploymentScores = calculateScoresForResponses(
        transformedForDeployment,
        questionBank,
        historicalScores
      );

      historicalScores.push(deploymentScores);
      if (deploymentScores.patterns.clarity?.current !== null) {
        historicalClarityScores.push(deploymentScores.patterns.clarity.current);
      }
    }

    // Calculate overall scores (all responses)
    const overallScores = calculateScoresForResponses(
      allTransformedResponses,
      questionBank,
      historicalScores
    );

    // Calculate leader scores
    const leaderScores = leaderResponses.length > 0
      ? calculateScoresForResponses(leaderResponses, questionBank, [])
      : {
          ali: { current: null, rolling: null, zone: null },
          anchors: { current: null, rolling: null },
          patterns: {}
        };

    // Calculate team scores
    const teamScores = teamMemberResponses.length > 0
      ? calculateScoresForResponses(teamMemberResponses, questionBank, [])
      : {
          ali: { current: null, rolling: null, zone: null },
          anchors: { current: null, rolling: null },
          patterns: {}
        };

    // Calculate rolling scores for leader and team separately
    // (This would need historical leader/team scores - simplified for now)
    const leaderRollingScores = leaderScores;
    const teamRollingScores = teamScores;

    // Three core scores (rolling pattern scores)
    const coreScores = calculateThreeCoreScores(overallScores.patterns);

    // Team Experience Map coordinates
    const experienceMap = calculateTeamExperienceMapCoordinates(
      overallScores.patterns.clarity?.rolling,
      overallScores.patterns.stability?.rolling,
      overallScores.patterns.trust?.rolling
    );

    // Calculate gaps for Leadership Mirror
    const trustGap = calculatePerceptionGap(
      leaderRollingScores.patterns.trust?.rolling,
      teamRollingScores.patterns.trust?.rolling
    );

    // Leadership Profile (team responses only)
    const leadershipProfile = calculateLeadershipProfile({
      rollingPatternScores: teamRollingScores.patterns,
      gaps: {
        trust: trustGap
      },
      historicalClarityScores: historicalClarityScores.slice(-4), // Last 4 surveys
      surveyCount: deployments.length
    });

    // Leadership Mirror - use rolling scores where available, fallback to current
    const leadershipMirror = calculateLeadershipMirror(
      {
        ali: leaderRollingScores.ali?.rolling || leaderRollingScores.ali?.current,
        alignment: leaderRollingScores.patterns.alignment?.rolling || leaderRollingScores.patterns.alignment?.current,
        stability: leaderRollingScores.patterns.stability?.rolling || leaderRollingScores.patterns.stability?.current,
        clarity: leaderRollingScores.patterns.clarity?.rolling || leaderRollingScores.patterns.clarity?.current
      },
      {
        ali: teamRollingScores.ali?.rolling || teamRollingScores.ali?.current,
        alignment: teamRollingScores.patterns.alignment?.rolling || teamRollingScores.patterns.alignment?.current,
        stability: teamRollingScores.patterns.stability?.rolling || teamRollingScores.patterns.stability?.current,
        clarity: teamRollingScores.patterns.clarity?.rolling || teamRollingScores.patterns.clarity?.current
      }
    );

    // Trajectory (prefer DriftIndex, fallback to qoq_delta)
    const trajectory = {
      value: overallScores.drift.drift_index !== null 
        ? overallScores.drift.drift_index 
        : overallScores.drift.delta_ali,
      direction: overallScores.drift.drift_index !== null
        ? (overallScores.drift.drift_index > 2 ? 'improving' : overallScores.drift.drift_index < -2 ? 'declining' : 'stable')
        : (overallScores.drift.delta_ali !== null 
          ? (overallScores.drift.delta_ali > 2 ? 'improving' : overallScores.drift.delta_ali < -2 ? 'declining' : 'stable')
          : 'stable'),
      magnitude: overallScores.drift.drift_index !== null
        ? Math.abs(overallScores.drift.drift_index)
        : (overallScores.drift.delta_ali !== null ? Math.abs(overallScores.drift.delta_ali) : 0),
      method: overallScores.drift.drift_index !== null ? 'drift_index' : 'qoq_delta'
    };

    // Data quality checks
    const totalResponses = allResponses?.length || 0;
    const meetsMinimumTeam = meetsMinimumN(totalResponses, 'team');
    const meetsMinimumOrg = meetsMinimumN(totalResponses, 'org');
    const dataQualityBanner = totalResponses >= 5 && totalResponses < 10;

    // Calculate standard deviation for all pattern scores
    const allPatternScores = Object.values(overallScores.patterns)
      .map(p => p.current)
      .filter(s => s !== null && s !== undefined);
    const standardDeviation = allPatternScores.length > 0
      ? calculateStandardDeviation(allPatternScores)
      : null;

    // Build surveys array
    const surveysArray = deployments.map(deployment => {
      const deploymentResponseCount = responsesByDeployment[deployment.id]?.length || 0;
      return {
        survey_index: deployment.survey_index,
        year: new Date(deployment.deployed_at).getFullYear(),
        quarter: getQuarterFromDate(deployment.deployed_at),
        status: deployment.status,
        response_count: deploymentResponseCount,
        deployed_at: deployment.deployed_at,
        closes_at: deployment.closes_at
      };
    });

    // Build historical trends
    const historicalTrends = historicalScores.map((score, index) => {
      const deployment = deployments[index];
      return {
        period: `${new Date(deployment.deployed_at).getFullYear()}-${getQuarterFromDate(deployment.deployed_at)}`,
        ali: score.ali.current,
        alignment: score.patterns.alignment?.current,
        stability: score.patterns.stability?.current,
        clarity: score.patterns.clarity?.current
      };
    });

    // Build pattern trends for reports
    const patternTrends = {};
    ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'].forEach(pattern => {
      patternTrends[pattern] = historicalScores.map((score, index) => ({
        survey_index: deployments[index].survey_index,
        score: score.patterns[pattern]?.current
      })).filter(item => item.score !== null && item.score !== undefined);
    });

    return res.status(200).json({
      company: {
        id: company.id,
        name: company.name,
        subscription_status: 'active' // TODO: Get from billing system
      },
      scores: overallScores,
      coreScores,
      experienceMap,
      leadershipProfile: {
        ...leadershipProfile,
        honesty: {
          ...leadershipProfile.honesty,
          gap_component_used: trustGap !== null && trustGap !== undefined
        },
        clarity: {
          level: leadershipProfile.clarity.level,
          stddev: leadershipProfile.clarity.variance ? Math.sqrt(leadershipProfile.clarity.variance) : null,
          state: leadershipProfile.clarity.state
        }
      },
      leadershipMirror,
      drift: overallScores.drift,
      trajectory,
      responseCounts: {
        overall: totalResponses,
        leader: leaderCount,
        team_member: teamMemberCount
      },
      dataQuality: {
        meets_minimum_n: meetsMinimumOrg,
        meets_minimum_n_team: meetsMinimumTeam,
        meets_minimum_n_org: meetsMinimumOrg,
        response_count: totalResponses,
        standard_deviation: standardDeviation,
        data_quality_banner: dataQualityBanner
      },
      surveys: surveysArray,
      historicalTrends,
      patternTrends
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

/**
 * Get quarter from date string
 */
function getQuarterFromDate(dateString) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  return 'Q4';
}

