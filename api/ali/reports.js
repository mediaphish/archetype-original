/**
 * ALI Reports - Historical Data
 * 
 * Get historical trend data across all years
 * 
 * GET /api/ali/reports?companyId=xxx
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import {
  calculatePatternScore,
  calculateAnchorScore,
  calculateALIScore,
  calculateRollingScore
} from '../../lib/ali-scoring.js';

/**
 * Transform response data from database format to scoring function format
 */
function transformResponsesForScoring(responseData, questionBank) {
  const transformed = [];
  
  for (const [stableId, responseValue] of Object.entries(responseData)) {
    const question = questionBank[stableId];
    if (!question || !responseValue || responseValue < 1 || responseValue > 5) {
      continue;
    }
    
    transformed.push({
      question_id: stableId,
      response: responseValue,
      is_negative: question.is_negative || false,
      is_anchor: question.is_anchor || false,
      pattern: question.pattern
    });
  }
  
  return transformed;
}

/**
 * Calculate scores for a deployment
 */
function calculateDeploymentScores(responses, questionBank, historicalScores = []) {
  const allTransformed = [];
  responses.forEach(response => {
    allTransformed.push(...transformResponsesForScoring(response.responses, questionBank));
  });

  if (allTransformed.length === 0) {
    return null;
  }

  const patterns = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];
  const patternScores = {};
  
  patterns.forEach(pattern => {
    patternScores[pattern] = calculatePatternScore(allTransformed, pattern);
  });
  
  const anchorScore = calculateAnchorScore(allTransformed);
  const aliScore = calculateALIScore(patternScores, anchorScore);
  
  // Calculate rolling scores
  const historicalALIScores = historicalScores.map(h => h.ali).filter(s => s !== null && s !== undefined);
  const rollingALI = historicalALIScores.length >= 3
    ? calculateRollingScore([aliScore, ...historicalALIScores].slice(0, 4), 4)
    : null;
  
  const rollingPatterns = {};
  patterns.forEach(pattern => {
    const historicalPatternScores = historicalScores.map(h => h.patterns?.[pattern]).filter(s => s !== null && s !== undefined);
    if (historicalPatternScores.length >= 3) {
      rollingPatterns[pattern] = calculateRollingScore([patternScores[pattern], ...historicalPatternScores].slice(0, 4), 4);
    } else {
      rollingPatterns[pattern] = null;
    }
  });

  return {
    ali: aliScore,
    rolling_ali: rollingALI,
    patterns: patternScores,
    rolling_patterns: rollingPatterns,
    anchors: anchorScore
  };
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

    // Get all completed deployments
    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select(`
        id,
        survey_index,
        deployed_at,
        status
      `)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('deployed_at', { ascending: true });

    if (deploymentsError) {
      console.error('Error fetching deployments:', deploymentsError);
      return res.status(500).json({ error: 'Failed to fetch survey deployments' });
    }

    if (!deployments || deployments.length === 0) {
      return res.status(200).json({
        overall_trend: [],
        pattern_trends: {
          clarity: [],
          consistency: [],
          trust: [],
          communication: [],
          alignment: [],
          stability: [],
          leadership_drift: []
        },
        key_insights: []
      });
    }

    // Load question bank
    const { data: questionBankData, error: qbError } = await supabaseAdmin
      .from('ali_question_bank')
      .select('stable_id, pattern, is_negative, is_anchor')
      .eq('status', 'active');

    if (qbError || !questionBankData) {
      return res.status(500).json({ error: 'Failed to load question bank' });
    }

    const questionBank = {};
    questionBankData.forEach(q => {
      questionBank[q.stable_id] = {
        pattern: q.pattern,
        is_negative: q.is_negative,
        is_anchor: q.is_anchor
      };
    });

    // Get all responses grouped by deployment
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

    // Group responses by deployment
    const responsesByDeployment = {};
    deployments.forEach(deployment => {
      responsesByDeployment[deployment.id] = [];
    });

    allResponses?.forEach(response => {
      responsesByDeployment[response.deployment_id]?.push(response);
    });

    // Calculate scores for each deployment
    const overallTrend = [];
    const patternTrends = {
      clarity: [],
      consistency: [],
      trust: [],
      communication: [],
      alignment: [],
      stability: [],
      leadership_drift: []
    };
    const historicalScores = [];

    for (const deployment of deployments) {
      const deploymentResponses = responsesByDeployment[deployment.id] || [];
      
      if (deploymentResponses.length === 0) continue;

      const scores = calculateDeploymentScores(deploymentResponses, questionBank, historicalScores);
      
      if (!scores) continue;

      historicalScores.push({
        ali: scores.ali,
        patterns: scores.patterns,
        anchors: scores.anchors
      });

      const year = new Date(deployment.deployed_at).getFullYear();
      const quarter = getQuarterFromDate(deployment.deployed_at);

      overallTrend.push({
        survey_index: deployment.survey_index,
        year,
        quarter,
        current_score: scores.ali,
        rolling_score: scores.rolling_ali
      });

      // Add to pattern trends
      Object.keys(patternTrends).forEach(pattern => {
        patternTrends[pattern].push({
          survey_index: deployment.survey_index,
          score: scores.patterns[pattern]
        });
      });
    }

    // Generate key insights
    const keyInsights = generateKeyInsights(overallTrend, patternTrends);

    return res.status(200).json({
      overall_trend: overallTrend,
      pattern_trends: patternTrends,
      key_insights: keyInsights
    });

  } catch (err) {
    console.error('Reports error:', err);
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

/**
 * Generate key insights from trend data
 */
function generateKeyInsights(overallTrend, patternTrends) {
  const insights = [];

  if (overallTrend.length === 0) {
    return insights;
  }

  // Overall trend insight
  if (overallTrend.length >= 2) {
    const latest = overallTrend[overallTrend.length - 1];
    const previous = overallTrend[overallTrend.length - 2];
    const change = latest.current_score - previous.current_score;
    
    if (Math.abs(change) > 5) {
      insights.push({
        title: change > 0 ? 'Improving Overall Score' : 'Declining Overall Score',
        description: `ALI score ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)} points from ${previous.survey_index} to ${latest.survey_index}`,
        metric: `ALI: ${previous.current_score.toFixed(1)} → ${latest.current_score.toFixed(1)}`
      });
    }
  }

  // Pattern insights - find biggest improvements and concerns
  const patternChanges = {};
  Object.keys(patternTrends).forEach(pattern => {
    const trend = patternTrends[pattern];
    if (trend.length >= 2) {
      const latest = trend[trend.length - 1].score;
      const previous = trend[trend.length - 2].score;
      if (latest !== null && previous !== null) {
        patternChanges[pattern] = latest - previous;
      }
    }
  });

  // Biggest improvement
  const biggestImprovement = Object.entries(patternChanges)
    .filter(([_, change]) => change > 0)
    .sort(([_, a], [__, b]) => b - a)[0];
  
  if (biggestImprovement) {
    const [pattern, change] = biggestImprovement;
    insights.push({
      title: `Strongest Improvement: ${pattern.charAt(0).toUpperCase() + pattern.slice(1)}`,
      description: `${pattern} score improved by ${change.toFixed(1)} points`,
      metric: `${pattern}: +${change.toFixed(1)}`
    });
  }

  // Biggest concern
  const biggestConcern = Object.entries(patternChanges)
    .filter(([_, change]) => change < 0)
    .sort(([_, a], [__, b]) => a - b)[0];
  
  if (biggestConcern) {
    const [pattern, change] = biggestConcern;
    insights.push({
      title: `Area of Concern: ${pattern.charAt(0).toUpperCase() + pattern.slice(1)}`,
      description: `${pattern} score declined by ${Math.abs(change).toFixed(1)} points`,
      metric: `${pattern}: ${change.toFixed(1)}`
    });
  }

  return insights;
}

