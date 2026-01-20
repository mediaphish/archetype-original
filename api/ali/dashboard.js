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
  calculateLeadershipMirror
} from '../../lib/ali-dashboard-calculations.js';
import {
  calculateTeamExperienceMapCoordinates
} from '../../lib/ali-scoring.js';

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

/**
 * Compute an individual Team Experience Map point for a single respondent response set.
 * We use per-respondent pattern scores (clarity, stability, trust) as coordinates.
 *
 * @returns {{x:number,y:number,zone:string}|null}
 */
function computeExperiencePointForSingleResponse(transformedResponses, questionBank) {
  if (!Array.isArray(transformedResponses) || transformedResponses.length === 0) return null;

  const clarity = calculatePatternScore(transformedResponses, 'clarity');
  const stability = calculatePatternScore(transformedResponses, 'stability');
  const trust = calculatePatternScore(transformedResponses, 'trust');

  if (clarity === null || stability === null || trust === null) return null;

  // Use the same coordinate system as the Team Experience Map:
  // X: clarity
  // Y: (stability + trust) / 2
  return calculateTeamExperienceMapCoordinates(clarity, stability, trust);
}

/**
 * Generate lightweight insights from current scores even with small N (pilot).
 * These are deterministic and do not require multi-quarter history.
 */
function generatePilotInsights({ overallScores, leadershipMirror, responseCounts, dataQuality }) {
  const insights = [];

  const patterns = overallScores?.patterns || {};
  const patternEntries = Object.entries(patterns)
    .map(([k, v]) => [k, v?.current])
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v));

  if (patternEntries.length > 0) {
    const sorted = patternEntries.slice().sort((a, b) => a[1] - b[1]);
    const [lowestKey, lowestVal] = sorted[0];
    const [highestKey, highestVal] = sorted[sorted.length - 1];

    const niceName = (k) => (k === 'leadership_drift' ? 'Leadership Alignment' : k.replace('_', ' '));

    insights.push({
      id: 'pilot-insight-1',
      title: `Strongest signal: ${niceName(highestKey)}`,
      text: `Your highest-scoring pattern right now is ${niceName(highestKey)} (${highestVal.toFixed(1)}). Protect what’s working here—this is your current strength.`,
      priority: 'high'
    });

    insights.push({
      id: 'pilot-insight-2',
      title: `Biggest opportunity: ${niceName(lowestKey)}`,
      text: `Your lowest-scoring pattern right now is ${niceName(lowestKey)} (${lowestVal.toFixed(1)}). This is the most direct place to focus for near-term improvement.`,
      priority: 'high'
    });
  }

  const gaps = leadershipMirror?.gaps || {};
  const gapEntries = Object.entries(gaps)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v));

  if (gapEntries.length > 0) {
    // Biggest absolute gap
    const [gapKey, gapVal] = gapEntries.slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    const label = gapKey === 'ali' ? 'ALI Overall' : gapKey;
    insights.push({
      id: 'pilot-insight-3',
      title: `Perception gap to watch: ${label}`,
      text: `There is a ${Math.abs(gapVal).toFixed(1)}pt perception gap on ${label}. This is often where misunderstanding and frustration build fastest.`,
      priority: 'medium'
    });
  }

  // Data quality / pilot note (always include, but keep it short)
  const total = typeof responseCounts?.overall === 'number' ? responseCounts.overall : null;
  const meetsOrg = !!dataQuality?.meets_minimum_n_org;
  insights.push({
    id: 'pilot-insight-meta',
    title: 'Pilot note',
    text: total !== null
      ? `These insights are based on ${total} responses. They will sharpen as more people respond and as additional quarters are completed.`
      : `These insights will sharpen as more people respond and as additional quarters are completed.`,
    priority: 'low'
  });

  return insights;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyId: companyIdParam, email } = req.query;

    if (!companyIdParam && !email) {
      return res.status(400).json({ error: 'companyId or email is required' });
    }

    let companyId = companyIdParam;
    if (!companyId && email) {
      // Resolve company from contact email (magic-link flow passes email)
      const normalizedEmail = String(email).trim().toLowerCase();
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('ali_contacts')
        .select('company_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (contactError) {
        console.error('Error resolving company from email:', contactError);
        return res.status(500).json({ error: 'Failed to resolve company for email' });
      }

      if (!contact?.company_id) {
        return res.status(404).json({ error: 'Account not found for email' });
      }

      companyId = contact.company_id;
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
        available_at,
        opens_at,
        created_at,
        closes_at,
        status
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: true });

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
      .select('id, deployment_id, responses, completed_at, respondent_role')
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
    const experienceMapPoints = [];

    for (const deployment of deployments) {
      const deploymentResponses = responsesByDeployment[deployment.id] || [];
      
      if (deploymentResponses.length === 0) continue;

      // Transform all responses for this deployment
      const transformedForDeployment = [];
      deploymentResponses.forEach(response => {
        // Prefer stored respondent_role (we capture this at submission time).
        // Fallback to heuristic only if missing.
        let isLeader = response.respondent_role === 'leader';
        if (response.respondent_role !== 'leader' && response.respondent_role !== 'team_member') {
          for (const stableId of Object.keys(response.responses || {})) {
            const question = questionBank[stableId];
            if (question && question.role === 'leader') {
              isLeader = true;
              break;
            }
          }
        }

        const transformed = transformResponsesForScoring(
          response.responses,
          questionBank,
          isLeader ? 'leader' : 'team_member'
        );

        transformedForDeployment.push(...transformed);
        // Individual experience-map point (one per respondent)
        const point = computeExperiencePointForSingleResponse(transformed, questionBank);
        if (point) {
          experienceMapPoints.push({
            x: point.x,
            y: point.y,
            zone: point.zone,
            role: isLeader ? 'leader' : 'team_member',
            completed_at: response.completed_at || null
          });
        }
        
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

    // Three core scores (rolling pattern scores) - need to pass rolling scores, not current
    const coreScores = calculateThreeCoreScores({
      alignment: overallScores.patterns.alignment?.rolling || overallScores.patterns.alignment?.current,
      stability: overallScores.patterns.stability?.rolling || overallScores.patterns.stability?.current,
      clarity: overallScores.patterns.clarity?.rolling || overallScores.patterns.clarity?.current
    });

    // Team Experience Map coordinates - use rolling scores where available, fallback to current
    const experienceMap = calculateTeamExperienceMapCoordinates(
      overallScores.patterns.clarity?.rolling || overallScores.patterns.clarity?.current,
      overallScores.patterns.stability?.rolling || overallScores.patterns.stability?.current,
      overallScores.patterns.trust?.rolling || overallScores.patterns.trust?.current
    );

    // Calculate gaps for Leadership Mirror
    const trustGap = calculatePerceptionGap(
      leaderRollingScores.patterns.trust?.rolling || leaderRollingScores.patterns.trust?.current,
      teamRollingScores.patterns.trust?.rolling || teamRollingScores.patterns.trust?.current
    );

    // Leadership Profile (team responses only) - use rolling scores where available
    const teamRollingPatterns = {};
    Object.keys(teamRollingScores.patterns || {}).forEach(pattern => {
      teamRollingPatterns[pattern] = teamRollingScores.patterns[pattern]?.rolling || teamRollingScores.patterns[pattern]?.current;
    });

    const leadershipProfile = calculateLeadershipProfile({
      rollingPatternScores: teamRollingPatterns,
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
    const drift = { ...(overallScores.drift || {}) };
    // If this is Survey 1 (no historical cycles), do not show movement.
    if (deployments.length < 2) {
      drift.delta_ali = null;
      drift.drift_index = null;
    }

    const trajectory = deployments.length < 2
      ? { value: null, direction: null, magnitude: null, method: null }
      : {
          value: drift.drift_index !== null 
            ? drift.drift_index 
            : drift.delta_ali,
          direction: drift.drift_index !== null
            ? (drift.drift_index > 2 ? 'improving' : drift.drift_index < -2 ? 'declining' : 'stable')
            : (drift.delta_ali !== null 
              ? (drift.delta_ali > 2 ? 'improving' : drift.delta_ali < -2 ? 'declining' : 'stable')
              : null),
          magnitude: drift.drift_index !== null
            ? Math.abs(drift.drift_index)
            : (drift.delta_ali !== null ? Math.abs(drift.delta_ali) : null),
          method: drift.drift_index !== null ? 'drift_index' : (drift.delta_ali !== null ? 'qoq_delta' : null)
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
      const deploymentDate = deployment.available_at || deployment.opens_at || deployment.created_at;
      return {
        survey_index: deployment.survey_index,
        year: deploymentDate ? new Date(deploymentDate).getFullYear() : null,
        quarter: deploymentDate ? getQuarterFromDate(deploymentDate) : null,
        status: deployment.status,
        response_count: deploymentResponseCount,
        // Back-compat: older clients used deployed_at. Our DB doesn't have it, so expose the best available date.
        deployed_at: deploymentDate,
        closes_at: deployment.closes_at
      };
    });

    // Build historical trends
    const historicalTrends = historicalScores.map((score, index) => {
      const deployment = deployments[index];
      const deploymentDate = deployment.available_at || deployment.opens_at || deployment.created_at;
      return {
        period: deploymentDate ? `${new Date(deploymentDate).getFullYear()}-${getQuarterFromDate(deploymentDate)}` : null,
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

    const responseCounts = {
      overall: totalResponses,
      leader: leaderCount,
      team_member: teamMemberCount
    };

    const dataQuality = {
      meets_minimum_n: meetsMinimumOrg,
      meets_minimum_n_team: meetsMinimumTeam,
      meets_minimum_n_org: meetsMinimumOrg,
      response_count: totalResponses,
      standard_deviation: standardDeviation,
      data_quality_banner: dataQualityBanner
    };

    const insights = generatePilotInsights({
      overallScores,
      leadershipMirror,
      responseCounts,
      dataQuality
    });

    // Simple recent activity for pilots (avoid fake years)
    const mostRecent = allResponses && allResponses.length > 0 ? allResponses[allResponses.length - 1] : null;
    const recentActivity = mostRecent ? [
      {
        id: 'activity-1',
        type: 'response_collected',
        message: `${totalResponses} response(s) collected`,
        timestamp: mostRecent.completed_at ? new Date(mostRecent.completed_at).toLocaleString() : 'recently'
      }
    ] : [];

    return res.status(200).json({
      company: {
        id: company.id,
        name: company.name,
        subscription_status: 'active' // TODO: Get from billing system
      },
      scores: overallScores,
      coreScores,
      experienceMap,
      experienceMapPoints,
      leadershipProfile: {
        profile: leadershipProfile?.profile || 'profile_forming',
        honesty: {
          score: leadershipProfile?.honesty?.score || null,
          state: leadershipProfile?.honesty?.state || null,
          gap_component_used: trustGap !== null && trustGap !== undefined
        },
        clarity: {
          level: leadershipProfile?.clarity?.level || null,
          stddev: leadershipProfile?.clarity?.variance ? Math.sqrt(leadershipProfile.clarity.variance) : (leadershipProfile?.clarity?.stddev || null),
          state: leadershipProfile?.clarity?.state || null
        }
      },
      leadershipMirror,
      drift,
      trajectory,
      responseCounts,
      dataQuality,
      surveys: surveysArray,
      historicalTrends,
      patternTrends,
      insights,
      recentActivity
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ 
      error: 'Server error. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

