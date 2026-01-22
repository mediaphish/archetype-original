/**
 * Super Admin Overview - Platform-wide metrics
 * 
 * Aggregates data across all companies for system-wide insights
 * GET /api/ali/super-admin/overview
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import {
  calculateALIScore,
  calculatePatternScore,
  calculateAnchorScore,
  classifyZone
} from '../../../lib/ali-scoring.js';

/**
 * Transform response data for scoring
 */
function transformResponsesForScoring(responseData, questionBank, role) {
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
      pattern: question.pattern,
      role: role
    });
  }
  return transformed;
}

/**
 * Calculate company ALI score from responses
 */
function calculateCompanyScore(responses, questionBank) {
  if (!responses || responses.length === 0) return null;
  
  const allTransformed = [];
  responses.forEach(response => {
    const role = response.respondent_role || 'team_member';
    const transformed = transformResponsesForScoring(response.responses, questionBank, role);
    allTransformed.push(...transformed);
  });

  if (allTransformed.length === 0) return null;

  const patterns = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];
  const patternScores = {};
  patterns.forEach(pattern => {
    patternScores[pattern] = calculatePatternScore(allTransformed, pattern);
  });

  const anchorScore = calculateAnchorScore(allTransformed);
  const aliScore = calculateALIScore(patternScores, anchorScore);
  
  return aliScore;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load question bank
    const { data: questionBankData, error: qbError } = await supabaseAdmin
      .from('ali_question_bank')
      .select('stable_id, pattern, is_negative, is_anchor, role')
      .eq('status', 'active');

    if (qbError || !questionBankData) {
      return res.status(500).json({ error: 'Failed to load question bank' });
    }

    const questionBank = {};
    questionBankData.forEach(q => {
      questionBank[q.stable_id] = {
        pattern: q.pattern,
        is_negative: q.is_negative,
        is_anchor: q.is_anchor,
        role: q.role
      };
    });

    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, created_at, status')
      .order('created_at', { ascending: false });

    if (companiesError) {
      return res.status(500).json({ error: 'Failed to fetch companies' });
    }

    const activeCompanies = companies?.filter(c => c.status === 'active' || !c.status) || [];
    const inactiveCompanies = companies?.filter(c => c.status === 'inactive') || [];

    // Get all contacts (leaders)
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('ali_contacts')
      .select('id, company_id, email, role, status, created_at')
      .in('company_id', companies?.map(c => c.id) || []);

    if (contactsError) {
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    const leaders = contacts?.filter(c => c.role === 'leader') || [];
    const activeLeaders = leaders.filter(l => l.status === 'active' || !l.status);
    const activeLeaderPercent = leaders.length > 0 ? (activeLeaders.length / leaders.length) * 100 : 0;

    // Get all survey deployments
    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, company_id, survey_index, created_at, status, available_at, opens_at, closes_at')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      return res.status(500).json({ error: 'Failed to fetch deployments' });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    const thisMonthDeployments = deployments?.filter(d => {
      const created = new Date(d.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }) || [];

    const thisQuarterDeployments = deployments?.filter(d => {
      const created = new Date(d.created_at);
      const q = Math.floor(created.getMonth() / 3);
      return q === currentQuarter && created.getFullYear() === currentYear;
    }) || [];

    // Get all responses
    const deploymentIds = deployments?.map(d => d.id) || [];
    const { data: allResponses, error: responsesError } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('id, deployment_id, company_id, responses, completed_at, respondent_role, created_at')
      .in('deployment_id', deploymentIds.length > 0 ? deploymentIds : ['00000000-0000-0000-0000-000000000000'])
      .order('completed_at', { ascending: true });

    if (responsesError) {
      return res.status(500).json({ error: 'Failed to fetch responses' });
    }

    // Calculate company scores for zone distribution
    const companyScores = [];
    const companyResponseMap = {};

    // Group responses by company
    allResponses?.forEach(response => {
      if (!companyResponseMap[response.company_id]) {
        companyResponseMap[response.company_id] = [];
      }
      companyResponseMap[response.company_id].push(response);
    });

    // Calculate score for each company
    Object.entries(companyResponseMap).forEach(([companyId, responses]) => {
      const score = calculateCompanyScore(responses, questionBank);
      if (score !== null) {
        companyScores.push({ companyId, score });
      }
    });

    // Zone distribution
    const zoneCounts = { green: 0, yellow: 0, orange: 0, red: 0 };
    companyScores.forEach(({ score }) => {
      const zone = classifyZone(score);
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });

    const totalScoredCompanies = companyScores.length;
    const zoneDistribution = [
      { 
        zone: 'green', 
        range: '75-100', 
        count: zoneCounts.green, 
        percent: totalScoredCompanies > 0 ? (zoneCounts.green / totalScoredCompanies) * 100 : 0 
      },
      { 
        zone: 'yellow', 
        range: '60-74', 
        count: zoneCounts.yellow, 
        percent: totalScoredCompanies > 0 ? (zoneCounts.yellow / totalScoredCompanies) * 100 : 0 
      },
      { 
        zone: 'orange', 
        range: '45-59', 
        count: zoneCounts.orange, 
        percent: totalScoredCompanies > 0 ? (zoneCounts.orange / totalScoredCompanies) * 100 : 0 
      },
      { 
        zone: 'red', 
        range: '0-44', 
        count: zoneCounts.red, 
        percent: totalScoredCompanies > 0 ? (zoneCounts.red / totalScoredCompanies) * 100 : 0 
      }
    ];

    // Calculate average ALI score
    const avgALIScore = companyScores.length > 0
      ? companyScores.reduce((sum, c) => sum + c.score, 0) / companyScores.length
      : 0;

    // Quarterly trends (last 4 quarters)
    const quarterlyTrends = [];
    const quarters = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - (i * 3));
      const q = Math.floor(date.getMonth() / 3);
      const year = date.getFullYear();
      quarters.push({ year, quarter: q + 1, label: `${year} Q${q + 1}` });
    }

    quarters.forEach(({ year, quarter, label }) => {
      const quarterDeployments = deployments?.filter(d => {
        const created = new Date(d.created_at);
        const q = Math.floor(created.getMonth() / 3) + 1;
        return q === quarter && created.getFullYear() === year;
      }) || [];

      const quarterDeploymentIds = quarterDeployments.map(d => d.id);
      const quarterResponses = allResponses?.filter(r => 
        quarterDeploymentIds.includes(r.deployment_id)
      ) || [];

      // Get unique companies for this quarter
      const quarterCompanyIds = new Set(quarterDeployments.map(d => d.company_id));
      const quarterLeaders = leaders.filter(l => quarterCompanyIds.has(l.company_id));

      // Calculate average score for this quarter
      const quarterCompanyScores = [];
      quarterCompanyIds.forEach(companyId => {
        const companyResponses = quarterResponses.filter(r => r.company_id === companyId);
        const score = calculateCompanyScore(companyResponses, questionBank);
        if (score !== null) {
          quarterCompanyScores.push(score);
        }
      });

      const quarterAvgScore = quarterCompanyScores.length > 0
        ? quarterCompanyScores.reduce((sum, s) => sum + s, 0) / quarterCompanyScores.length
        : 0;

      const prevQuarter = quarters[quarters.indexOf({ year, quarter, label }) - 1];
      const changes = {};
      if (prevQuarter) {
        const prevQuarterDeployments = deployments?.filter(d => {
          const created = new Date(d.created_at);
          const q = Math.floor(created.getMonth() / 3) + 1;
          return q === prevQuarter.quarter && created.getFullYear() === prevQuarter.year;
        }) || [];
        const prevQuarterCompanyIds = new Set(prevQuarterDeployments.map(d => d.company_id));
        changes.companies = quarterCompanyIds.size - prevQuarterCompanyIds.size;
        const prevQuarterLeaders = leaders.filter(l => prevQuarterCompanyIds.has(l.company_id));
        changes.leaders = quarterLeaders.length - prevQuarterLeaders.length;
      }

      quarterlyTrends.push({
        quarter: label,
        companies: quarterCompanyIds.size,
        leaders: quarterLeaders.length,
        avgScore: quarterAvgScore,
        responses: quarterResponses.length,
        changes
      });
    });

    // Engagement metrics
    const totalResponses = allResponses?.length || 0;
    const totalDeployments = deployments?.length || 0;
    const uniqueCompaniesWithResponses = new Set(allResponses?.map(r => r.company_id) || []).size;
    
    const responseRate = activeLeaders.length > 0 
      ? (totalResponses / (activeLeaders.length * totalDeployments)) * 100 
      : 0;

    // Calculate average completion time (if we have that data)
    const completionTimes = allResponses?.map(r => {
      if (r.completed_at && r.created_at) {
        const start = new Date(r.created_at);
        const end = new Date(r.completed_at);
        return (end - start) / 1000 / 60; // minutes
      }
      return null;
    }).filter(t => t !== null) || [];

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
      : 0;

    const surveysPerCompany = activeCompanies.length > 0 
      ? totalDeployments / activeCompanies.length 
      : 0;

    const responsesPerSurvey = totalDeployments > 0 
      ? totalResponses / totalDeployments 
      : 0;

    // Pattern analysis across platform
    const allPatternScores = { clarity: [], consistency: [], trust: [], communication: [], alignment: [], stability: [], leadership_drift: [] };
    
    companyScores.forEach(({ companyId }) => {
      const companyResponses = companyResponseMap[companyId] || [];
      const allTransformed = [];
      companyResponses.forEach(response => {
        const role = response.respondent_role || 'team_member';
        const transformed = transformResponsesForScoring(response.responses, questionBank, role);
        allTransformed.push(...transformed);
      });

      if (allTransformed.length > 0) {
        Object.keys(allPatternScores).forEach(pattern => {
          const score = calculatePatternScore(allTransformed, pattern);
          if (score !== null) {
            allPatternScores[pattern].push(score);
          }
        });
      }
    });

    const patterns = Object.entries(allPatternScores).map(([name, scores]) => {
      const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      // Calculate change (simplified - compare to previous quarter)
      const change = 0; // TODO: Calculate actual change when we have historical data
      return {
        name: name === 'leadership_drift' ? 'Leadership Alignment' : name.charAt(0).toUpperCase() + name.slice(1),
        score: avg,
        change,
        distribution: { high: 0, medium: 0, low: 0 } // TODO: Calculate distribution
      };
    });

    // Top performing companies
    const topCompanies = companyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ companyId, score }) => {
        const company = companies?.find(c => c.id === companyId);
        const companyLeaders = leaders.filter(l => l.company_id === companyId);
        const companyDeployments = deployments?.filter(d => d.company_id === companyId) || [];
        return {
          name: company?.name || 'Unknown',
          leaders: companyLeaders.length,
          surveys: companyDeployments.length,
          score: score,
          zone: classifyZone(score)
        };
      });

    return res.status(200).json({
      ok: true,
      overview: {
        metrics: {
          companies: { 
            total: companies?.length || 0, 
            active: activeCompanies.length, 
            inactive: inactiveCompanies.length 
          },
          leaders: { 
            total: leaders.length, 
            active: activeLeaders.length, 
            activePercent: activeLeaderPercent 
          },
          surveys: { 
            total: deployments?.length || 0, 
            thisMonth: thisMonthDeployments.length, 
            thisQuarter: thisQuarterDeployments.length 
          },
          avgALIScore: avgALIScore
        },
        zoneDistribution,
        quarterlyTrends,
        engagement: {
          responseRate: Math.min(responseRate, 100),
          completionTime: avgCompletionTime,
          surveysPerCompany: surveysPerCompany,
          responsesPerSurvey: responsesPerSurvey
        },
        patterns,
        topCompanies
      }
    });

  } catch (error) {
    console.error('Super Admin Overview error:', error);
    return res.status(500).json({ error: 'Failed to generate overview' });
  }
}
