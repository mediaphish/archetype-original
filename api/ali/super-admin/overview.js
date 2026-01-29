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
  classifyZone,
  calculatePerceptionGap,
  classifyGapSeverity,
  calculateTeamExperienceMapCoordinates,
  reverseScore,
  normalizeTo100
} from '../../../lib/ali-scoring.js';
import {
  calculateLeadershipMirror
} from '../../../lib/ali-dashboard-calculations.js';

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

const PATTERN_KEYS = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = p * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * Calculate company ALI score from responses
 */
function calculateCompanyScore(responses, questionBank) {
  const out = getCompanyScoreAndPatterns(responses, questionBank);
  return out ? out.score : null;
}

/**
 * Calculate company ALI score and per-pattern scores (for content-mining metrics).
 * @returns {{ score: number, patternScores: Record<string, number> } | null}
 */
function getCompanyScoreAndPatterns(responses, questionBank) {
  if (!responses || responses.length === 0) return null;
  const allTransformed = [];
  responses.forEach((response) => {
    const role = response.respondent_role || 'team_member';
    const transformed = transformResponsesForScoring(response.responses, questionBank, role);
    allTransformed.push(...transformed);
  });
  if (allTransformed.length === 0) return null;
  const patternScores = {};
  PATTERN_KEYS.forEach((p) => {
    patternScores[p] = calculatePatternScore(allTransformed, p);
  });
  const anchorScore = calculateAnchorScore(allTransformed);
  const score = calculateALIScore(patternScores, anchorScore);
  return { score, patternScores };
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
      console.error('Error loading question bank:', qbError);
      return res.status(500).json({ ok: false, error: 'Failed to load question bank', detail: qbError?.message });
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

    // Get all companies (include industry, company_size for segmentation)
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, created_at, status, industry, company_size')
      .order('created_at', { ascending: false });

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch companies', detail: companiesError.message });
    }

    const activeCompanies = companies?.filter(c => c.status === 'active' || !c.status) || [];
    const inactiveCompanies = companies?.filter(c => c.status === 'inactive') || [];
    
    console.log(`[SUPER ADMIN] Found ${companies?.length || 0} companies (${activeCompanies.length} active, ${inactiveCompanies.length} inactive)`);

    // Get all contacts (leaders)
    let contacts = [];
    let contactsError = null;
    
    if (companies && companies.length > 0) {
      const companyIds = companies.map(c => c.id);
      const response = await supabaseAdmin
        .from('ali_contacts')
        .select('id, company_id, email, role, created_at')
        .in('company_id', companyIds);
      
      contacts = response.data || [];
      contactsError = response.error;
    }

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch contacts', detail: contactsError.message });
    }

    const leaders = contacts.filter(c => c.role === 'leader') || [];
    // All leaders are considered active (no status field in ali_contacts)
    const activeLeaders = leaders;
    const activeLeaderPercent = leaders.length > 0 ? 100 : 0;

    // Get all survey deployments
    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, company_id, survey_index, created_at, status, available_at, opens_at, closes_at')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      console.error('Error fetching deployments:', deploymentsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch deployments', detail: deploymentsError.message });
    }
    
    console.log(`[SUPER ADMIN] Found ${deployments?.length || 0} total deployments`);
    console.log(`[SUPER ADMIN] Deployment company IDs:`, deployments?.map(d => ({ id: d.id, company_id: d.company_id, survey_index: d.survey_index })));
    
    // Get all responses first to determine which companies have actual responses
    const allDeploymentIds = deployments?.map(d => d.id) || [];
    console.log(`[SUPER ADMIN] Fetching responses for ${allDeploymentIds.length} deployments`);
    let allResponses = [];
    let responsesError = null;
    
    // Create deployment_id -> company_id map
    const deploymentToCompanyMap = {};
    deployments?.forEach(d => {
      deploymentToCompanyMap[d.id] = d.company_id;
    });
    
    if (allDeploymentIds.length > 0) {
      const response = await supabaseAdmin
        .from('ali_survey_responses')
        .select('id, deployment_id, responses, completed_at, respondent_role, created_at')
        .in('deployment_id', allDeploymentIds)
        .order('completed_at', { ascending: true });
      
      allResponses = response.data || [];
      responsesError = response.error;
      
      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
        // Don't return error - continue with empty responses
        allResponses = [];
      }
    } else {
      console.log('[SUPER ADMIN] No deployments found, skipping response fetch');
      allResponses = [];
    }
    
    
    // Count actual responses by role
    const leaderResponses = allResponses?.filter(r => r.respondent_role === 'leader') || [];
    const teamMemberResponses = allResponses?.filter(r => r.respondent_role === 'team_member') || [];
    const leaderResponseCount = leaderResponses.length;
    const teamMemberResponseCount = teamMemberResponses.length;
    
    console.log(`[SUPER ADMIN] Found ${allResponses?.length || 0} total responses (${leaderResponseCount} leader responses, ${teamMemberResponseCount} team member responses)`);
    
    // Count unique leaders from survey responses (respondent_role = 'leader')
    // Since responses are anonymous, we count the number of leader responses as the leader count
    // The user wants to see how many leaders responded, not how many are in contacts
    const actualLeaderCount = leaderResponseCount;
    
    console.log(`[SUPER ADMIN] Leader count from responses: ${actualLeaderCount}`);
    
    // Determine which companies have actual responses (for company filtering)
    const companiesWithResponses = new Set();
    allResponses?.forEach(response => {
      const companyId = deploymentToCompanyMap[response.deployment_id];
      if (companyId) {
        companiesWithResponses.add(companyId);
      }
    });
    
    console.log(`[SUPER ADMIN] Companies with responses:`, Array.from(companiesWithResponses));
    
    // Only show companies that have actual responses (filter out test/seed data)
    const realCompanies = companies?.filter(c => companiesWithResponses.has(c.id)) || [];
    const realActiveCompanies = realCompanies.filter(c => c.status === 'active' || !c.status);
    const realInactiveCompanies = realCompanies.filter(c => c.status === 'inactive');
    
    // Only count deployments from companies with responses
    const realDeployments = deployments?.filter(d => companiesWithResponses.has(d.company_id)) || [];
    console.log(`[SUPER ADMIN] Total deployments from companies with responses: ${realDeployments.length}`);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    const thisMonthDeployments = realDeployments.filter(d => {
      const created = new Date(d.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    });

    const thisQuarterDeployments = realDeployments.filter(d => {
      const created = new Date(d.created_at);
      const q = Math.floor(created.getMonth() / 3);
      return q === currentQuarter && created.getFullYear() === currentYear;
    });

    // Calculate company scores for zone distribution
    const companyScores = [];
    const companyResponseMap = {};

    // Group responses by company (using deployment_id -> company_id map)
    allResponses?.forEach(response => {
      const companyId = deploymentToCompanyMap[response.deployment_id];
      if (!companyId) return; // Skip if deployment not found
      
      if (!companyResponseMap[companyId]) {
        companyResponseMap[companyId] = [];
      }
      companyResponseMap[companyId].push(response);
    });

    // Calculate score and pattern scores for each company (pattern scores for content-mining)
    const companyPatternMap = {};
    Object.entries(companyResponseMap).forEach(([companyId, responses]) => {
      try {
        const out = getCompanyScoreAndPatterns(responses, questionBank);
        if (out && out.score !== null && Number.isFinite(out.score)) {
          companyScores.push({ companyId, score: out.score });
          companyPatternMap[companyId] = out.patternScores;
          console.log(`[SUPER ADMIN] Company ${companyId} score: ${out.score.toFixed(1)}`);
        } else {
          console.log(`[SUPER ADMIN] Company ${companyId} score calculation returned null or invalid`);
        }
      } catch (error) {
        console.error(`[SUPER ADMIN] Error calculating score for company ${companyId}:`, error);
      }
    });

    console.log(`[SUPER ADMIN] Company scores calculated: ${companyScores.length}`);
    
    console.log(`[SUPER ADMIN] Companies with responses: ${realCompanies.length} (${realActiveCompanies.length} active, ${realInactiveCompanies.length} inactive)`);

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
    const companyScoresByQuarter = {};
    const quarters = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - (i * 3));
      const q = Math.floor(date.getMonth() / 3);
      const year = date.getFullYear();
      quarters.push({ year, quarter: q + 1, label: `${year} Q${q + 1}` });
    }

    quarters.forEach(({ year, quarter, label }) => {
      const quarterDeployments = realDeployments.filter(d => {
        const created = new Date(d.created_at);
        const q = Math.floor(created.getMonth() / 3) + 1;
        return q === quarter && created.getFullYear() === year;
      }) || [];

      const quarterDeploymentIds = quarterDeployments.map(d => d.id);
      const quarterResponses = allResponses?.filter(r =>
        quarterDeploymentIds.includes(r.deployment_id)
      ) || [];

      const quarterCompanyIds = new Set(quarterDeployments.map(d => d.company_id));
      const quarterLeaderResponses = quarterResponses.filter(r => r.respondent_role === 'leader');
      const quarterLeaderCount = quarterLeaderResponses.length;

      const quarterCompanyScores = [];
      const quarterCompanyScoreMap = {};
      quarterCompanyIds.forEach((companyId) => {
        const companyResponses = quarterResponses.filter((r) => {
          const respCompanyId = deploymentToCompanyMap[r.deployment_id];
          return respCompanyId === companyId;
        });
        const score = calculateCompanyScore(companyResponses, questionBank);
        if (score !== null) {
          quarterCompanyScores.push(score);
          quarterCompanyScoreMap[companyId] = score;
        }
      });
      companyScoresByQuarter[label] = quarterCompanyScoreMap;

      const quarterAvgScore = quarterCompanyScores.length > 0
        ? quarterCompanyScores.reduce((sum, s) => sum + s, 0) / quarterCompanyScores.length
        : 0;

      const prevIdx = quarters.findIndex((q) => q.label === label) - 1;
      const prevQuarter = prevIdx >= 0 ? quarters[prevIdx] : null;
      const changes = {};
      if (prevQuarter) {
        const prevQuarterDeployments = realDeployments.filter(d => {
          const created = new Date(d.created_at);
          const q = Math.floor(created.getMonth() / 3) + 1;
          return q === prevQuarter.quarter && created.getFullYear() === prevQuarter.year;
        }) || [];
        const prevQuarterCompanyIds = new Set(prevQuarterDeployments.map(d => d.company_id));
        changes.companies = quarterCompanyIds.size - prevQuarterCompanyIds.size;
        const prevQuarterResponses = allResponses?.filter(r => {
          const respDeploymentId = r.deployment_id;
          return prevQuarterDeployments.some(d => d.id === respDeploymentId);
        }) || [];
        const prevQuarterLeaderCount = prevQuarterResponses.filter(r => r.respondent_role === 'leader').length;
        changes.leaders = quarterLeaderCount - prevQuarterLeaderCount;
      }

      quarterlyTrends.push({
        quarter: label,
        companies: quarterCompanyIds.size,
        leaders: quarterLeaderCount,
        avgScore: quarterAvgScore,
        responses: quarterResponses.length,
        changes
      });
    });

    // Engagement metrics
    const totalResponses = allResponses?.length || 0;
    const totalDeployments = realDeployments.length;
    
    // Response rate: total responses / (expected responses)
    // Expected = number of leaders * number of deployments (assuming each leader should respond to each survey)
    // But since we're counting actual leader responses, let's use a simpler calculation
    const responseRate = totalDeployments > 0 && actualLeaderCount > 0
      ? Math.min(100, (totalResponses / (actualLeaderCount * totalDeployments)) * 100)
      : totalResponses > 0 ? 100 : 0;

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

    const surveysPerCompany = realActiveCompanies.length > 0 
      ? totalDeployments / realActiveCompanies.length 
      : 0;

    const responsesPerSurvey = totalDeployments > 0
      ? totalResponses / totalDeployments
      : 0;

    // Engagement detail: cadence mix, velocity, retention
    const cadenceMix = { S1: 0, S2: 0, S3: 0, S4: 0 };
    realDeployments.forEach((d) => {
      const k = (d.survey_index || 'S1').toString();
      if (cadenceMix[k] !== undefined) cadenceMix[k] += 1;
    });
    const velocity = { timeToFirst: [], timeTo5: [], timeTo10: [] };
    realDeployments.forEach((d) => {
      const at = d.available_at ? new Date(d.available_at) : (d.opens_at ? new Date(d.opens_at) : new Date(d.created_at));
      const resps = (allResponses || []).filter((r) => r.deployment_id === d.id && r.completed_at).map((r) => new Date(r.completed_at).getTime()).sort((a, b) => a - b);
      if (resps.length === 0) return;
      const first = resps[0] - at.getTime();
      velocity.timeToFirst.push(first / 1000 / 60);
      if (resps.length >= 5) velocity.timeTo5.push((resps[4] - at.getTime()) / 1000 / 60);
      if (resps.length >= 10) velocity.timeTo10.push((resps[9] - at.getTime()) / 1000 / 60);
    });
    const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
    const retention = { oneDeployment: 0, twoOrMore: 0 };
    const deploymentsByCompany = {};
    realDeployments.forEach((d) => {
      deploymentsByCompany[d.company_id] = (deploymentsByCompany[d.company_id] || 0) + 1;
    });
    Object.values(deploymentsByCompany).forEach((n) => {
      if (n >= 2) retention.twoOrMore += 1;
      else retention.oneDeployment += 1;
    });
    const engagementDetail = {
      cadenceMix,
      velocity: {
        avgMinutesToFirst: avg(velocity.timeToFirst),
        avgMinutesTo5: avg(velocity.timeTo5),
        avgMinutesTo10: avg(velocity.timeTo10)
      },
      retention
    };

    // Pattern analysis across platform - calculate from all responses
    const allPatternScores = { clarity: [], consistency: [], trust: [], communication: [], alignment: [], stability: [], leadership_drift: [] };
    
    // Calculate patterns from all responses across all companies with responses
    const allTransformedResponses = [];
    allResponses?.forEach(response => {
      const role = response.respondent_role || 'team_member';
      try {
        const transformed = transformResponsesForScoring(response.responses, questionBank, role);
        allTransformedResponses.push(...transformed);
      } catch (error) {
        console.error(`[SUPER ADMIN] Error transforming response ${response.id}:`, error);
      }
    });

    if (allTransformedResponses.length > 0) {
      Object.keys(allPatternScores).forEach(pattern => {
        try {
          const score = calculatePatternScore(allTransformedResponses, pattern);
          if (score !== null && Number.isFinite(score)) {
            allPatternScores[pattern].push(score);
          }
        } catch (error) {
          console.error(`[SUPER ADMIN] Error calculating pattern ${pattern}:`, error);
        }
      });
    }
    
    console.log(`[SUPER ADMIN] Pattern scores:`, Object.entries(allPatternScores).map(([k, v]) => `${k}: ${v.length > 0 ? v[0].toFixed(1) : 'N/A'}`));

    const patterns = Object.entries(allPatternScores).map(([name, scores]) => {
      // For pattern analysis, we calculate the average across all responses
      // Since we're aggregating all responses, we should have one score per pattern
      const avg = scores.length > 0 ? scores[0] : 0; // Only one score per pattern (aggregated)
      // Calculate change (simplified - compare to previous quarter)
      const change = 0; // TODO: Calculate actual change when we have historical data
      
      // Calculate distribution based on the average score
      // For platform-wide, we categorize the average score
      const highPercent = avg >= 75 ? 100 : 0;
      const mediumPercent = avg >= 60 && avg < 75 ? 100 : 0;
      const lowPercent = avg < 60 ? 100 : 0;
      
      return {
        name: name === 'leadership_drift' ? 'Leadership Alignment' : name.charAt(0).toUpperCase() + name.slice(1),
        score: avg,
        change,
        distribution: { 
          high: highPercent, 
          medium: mediumPercent, 
          low: lowPercent
        }
      };
    });

    // Top performing companies
    const topCompanies = companyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ companyId, score }) => {
        const company = companies?.find(c => c.id === companyId);
        const companyLeaders = leaders.filter(l => l.company_id === companyId);
        const companyDeployments = realDeployments.filter(d => d.company_id === companyId);
        return {
          name: company?.name || 'Unknown',
          leaders: companyLeaders.length,
          surveys: companyDeployments.length,
          score: score,
          zone: classifyZone(score)
        };
      });

    // Platform Leadership Mirror: aggregate leader vs team scores across all responses
    const driftToAlignment = (v) => (typeof v === 'number' && Number.isFinite(v) ? 100 - v : null);

    let leadershipMirror = { gaps: {}, severity: {}, leaderScores: {}, teamScores: {} };
    let experienceMap = null;

    const leaderTransformed = [];
    leaderResponses.forEach((r) => {
      try {
        leaderTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'leader'));
      } catch (e) {
        console.error('[SUPER ADMIN] Error transforming leader response:', e);
      }
    });
    const teamTransformed = [];
    teamMemberResponses.forEach((r) => {
      try {
        teamTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'team_member'));
      } catch (e) {
        console.error('[SUPER ADMIN] Error transforming team response:', e);
      }
    });

    if (leaderTransformed.length > 0 && teamTransformed.length > 0) {
      const leaderPatterns = {};
      const teamPatterns = {};
      PATTERN_KEYS.forEach((p) => {
        leaderPatterns[p] = calculatePatternScore(leaderTransformed, p);
        teamPatterns[p] = calculatePatternScore(teamTransformed, p);
      });
      const leaderAnchor = calculateAnchorScore(leaderTransformed);
      const teamAnchor = calculateAnchorScore(teamTransformed);
      const leaderALI = calculateALIScore(leaderPatterns, leaderAnchor);
      const teamALI = calculateALIScore(teamPatterns, teamAnchor);

      const leaderMirrorScores = {
        ali: leaderALI,
        clarity: leaderPatterns.clarity ?? null,
        consistency: leaderPatterns.consistency ?? null,
        trust: leaderPatterns.trust ?? null,
        communication: leaderPatterns.communication ?? null,
        alignment: leaderPatterns.alignment ?? null,
        stability: leaderPatterns.stability ?? null,
        leadership_drift: driftToAlignment(leaderPatterns.leadership_drift)
      };
      const teamMirrorScores = {
        ali: teamALI,
        clarity: teamPatterns.clarity ?? null,
        consistency: teamPatterns.consistency ?? null,
        trust: teamPatterns.trust ?? null,
        communication: teamPatterns.communication ?? null,
        alignment: teamPatterns.alignment ?? null,
        stability: teamPatterns.stability ?? null,
        leadership_drift: driftToAlignment(teamPatterns.leadership_drift)
      };
      leadershipMirror = calculateLeadershipMirror(leaderMirrorScores, teamMirrorScores);

      // Platform Experience Map: team-only clarity, stability, trust
      const tClarity = teamPatterns.clarity ?? null;
      const tStability = teamPatterns.stability ?? null;
      const tTrust = teamPatterns.trust ?? null;
      experienceMap = calculateTeamExperienceMapCoordinates(tClarity, tStability, tTrust);
    }

    // Segmentation by industry and company_size (only companies with responses)
    const segmentBucket = (getValue) => {
      const groups = {};
      realCompanies.forEach((c) => {
        const v = (getValue(c) || '').toString().trim() || 'Unspecified';
        if (!groups[v]) groups[v] = { companies: 0, responses: 0, totalScore: 0 };
        groups[v].companies += 1;
        const resps = companyResponseMap[c.id] || [];
        groups[v].responses += resps.length;
        const sc = companyScores.find((s) => s.companyId === c.id);
        if (sc && Number.isFinite(sc.score)) groups[v].totalScore += sc.score;
      });
      return Object.entries(groups)
        .map(([segment, g]) => ({
          segment,
          companies: g.companies,
          responses: g.responses,
          avgALI: g.companies > 0 ? g.totalScore / g.companies : 0
        }))
        .sort((a, b) => b.companies - a.companies);
    };
    const byIndustry = segmentBucket((c) => c.industry);
    const byCompanySize = segmentBucket((c) => c.company_size);

    // Content-mining: pattern prevalence, hardest patterns, gap themes, zone transitions
    const patternPrevalence = [];
    const hardestPatternCounts = {};
    PATTERN_KEYS.forEach((p) => { hardestPatternCounts[p] = 0; });
    let companiesWithBottom2 = 0;
    const gapSeverityCounts = { clarity: {}, consistency: {}, trust: {}, communication: {}, alignment: {}, stability: {} };
    const mirrorGapKeys = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability'];
    mirrorGapKeys.forEach((k) => {
      gapSeverityCounts[k] = { critical: 0, significant: 0, moderate: 0, neutral: 0, caution: 0 };
    });

    Object.entries(companyPatternMap).forEach(([companyId, pats]) => {
      const entries = Object.entries(pats).filter(([, v]) => v != null && Number.isFinite(v)).map(([k, v]) => [k, v]);
      if (entries.length < 2) return;
      const sorted = entries.sort((a, b) => a[1] - b[1]);
      const lowest = sorted[0][0];
      const secondLowest = sorted[1][0];
      hardestPatternCounts[lowest] = (hardestPatternCounts[lowest] || 0) + 1;
      companiesWithBottom2 += 1;
      const bottom2 = new Set([lowest, secondLowest]);
      PATTERN_KEYS.forEach((p) => {
        if (bottom2.has(p)) {
          const i = patternPrevalence.findIndex((x) => x.pattern === p);
          if (i >= 0) patternPrevalence[i].companies += 1;
          else patternPrevalence.push({ pattern: p, companies: 1 });
        }
      });
    });
    const nCompanies = Object.keys(companyPatternMap).length;
    patternPrevalence.forEach((r) => {
      r.pctBottom2 = nCompanies > 0 ? (r.companies / nCompanies) * 100 : 0;
    });
    patternPrevalence.sort((a, b) => b.pctBottom2 - a.pctBottom2);

    const hardestPatterns = Object.entries(hardestPatternCounts)
      .map(([pattern, timesLowest]) => ({ pattern, timesLowest }))
      .sort((a, b) => b.timesLowest - a.timesLowest);

    Object.entries(companyResponseMap).forEach(([companyId, responses]) => {
      const leaders = responses.filter((r) => r.respondent_role === 'leader');
      const team = responses.filter((r) => r.respondent_role === 'team_member');
      if (leaders.length === 0 || team.length === 0) return;
      const lTransformed = [];
      leaders.forEach((r) => { try { lTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'leader')); } catch (_) {} });
      const tTransformed = [];
      team.forEach((r) => { try { tTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'team_member')); } catch (_) {} });
      if (lTransformed.length === 0 || tTransformed.length === 0) return;
      const lp = {}; const tp = {};
      PATTERN_KEYS.forEach((p) => {
        lp[p] = calculatePatternScore(lTransformed, p);
        tp[p] = calculatePatternScore(tTransformed, p);
      });
      const lMirror = { ali: null, clarity: lp.clarity, consistency: lp.consistency, trust: lp.trust, communication: lp.communication, alignment: lp.alignment, stability: lp.stability, leadership_drift: driftToAlignment(lp.leadership_drift) };
      const tMirror = { ali: null, clarity: tp.clarity, consistency: tp.consistency, trust: tp.trust, communication: tp.communication, alignment: tp.alignment, stability: tp.stability, leadership_drift: driftToAlignment(tp.leadership_drift) };
      const mir = calculateLeadershipMirror(lMirror, tMirror);
      mirrorGapKeys.forEach((k) => {
        const sev = (mir.severity && mir.severity[k]) ? String(mir.severity[k]).toLowerCase() : 'neutral';
        if (gapSeverityCounts[k][sev] !== undefined) gapSeverityCounts[k][sev] += 1;
        else gapSeverityCounts[k].neutral += 1;
      });
    });
    const gapThemes = mirrorGapKeys.map((gap) => ({
      gap,
      critical: gapSeverityCounts[gap].critical || 0,
      significant: gapSeverityCounts[gap].significant || 0,
      caution: gapSeverityCounts[gap].caution || 0,
      moderate: gapSeverityCounts[gap].moderate || 0,
      neutral: gapSeverityCounts[gap].neutral || 0
    }));

    const zoneTransitions = [];
    const quarterLabels = Object.keys(companyScoresByQuarter).sort();
    for (let i = 0; i < quarterLabels.length - 1; i++) {
      const q1 = quarterLabels[i];
      const q2 = quarterLabels[i + 1];
      const m1 = companyScoresByQuarter[q1] || {};
      const m2 = companyScoresByQuarter[q2] || {};
      const fromTo = {};
      Object.keys(m1).forEach((cid) => {
        if (m2[cid] == null) return;
        const z1 = classifyZone(m1[cid]);
        const z2 = classifyZone(m2[cid]);
        if (z1 === z2) return;
        const key = `${z1}→${z2}`;
        fromTo[key] = (fromTo[key] || 0) + 1;
      });
      Object.entries(fromTo).forEach(([key, count]) => {
        const [from, to] = key.split('→');
        zoneTransitions.push({ from, to, count, quarters: `${q1}→${q2}` });
      });
    }

    const contentMining = {
      patternPrevalence,
      hardestPatterns,
      gapThemes,
      zoneTransitions
    };

    // Product/tool metrics: gap severity distribution, question-level stats, negative vs positive
    let totalGapReadings = 0;
    const gapSeverityTotals = { critical: 0, significant: 0, caution: 0, moderate: 0, neutral: 0 };
    gapThemes.forEach((r) => {
      ['critical', 'significant', 'caution', 'moderate', 'neutral'].forEach((s) => {
        const c = r[s] || 0;
        gapSeverityTotals[s] += c;
        totalGapReadings += c;
      });
    });
    const gapSeverityDistribution = totalGapReadings > 0
      ? {
          criticalPct: (gapSeverityTotals.critical / totalGapReadings) * 100,
          significantPct: ((gapSeverityTotals.significant + gapSeverityTotals.caution) / totalGapReadings) * 100,
          moderatePct: (gapSeverityTotals.moderate / totalGapReadings) * 100,
          neutralPct: (gapSeverityTotals.neutral / totalGapReadings) * 100
        }
      : null;

    const questionLevel = {};
    const qValues = {};
    (allResponses || []).forEach((r) => {
      const role = r.respondent_role || 'team_member';
      const transformed = transformResponsesForScoring(r.responses, questionBank, role);
      transformed.forEach((t) => {
        const v = normalizeTo100(reverseScore(t.response, t.is_negative));
        if (!qValues[t.question_id]) qValues[t.question_id] = [];
        qValues[t.question_id].push(v);
      });
    });
    Object.entries(qValues).forEach(([sid, vals]) => {
      const n = vals.length;
      const mean = vals.reduce((s, x) => s + x, 0) / n;
      const variance = n > 1 ? vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : 0;
      questionLevel[sid] = { mean, variance, n };
    });

    const negPosLeader = { positive: [], negative: [] };
    const negPosTeam = { positive: [], negative: [] };
    (allResponses || []).forEach((r) => {
      const role = r.respondent_role || 'team_member';
      const transformed = transformResponsesForScoring(r.responses, questionBank, role);
      const target = role === 'leader' ? negPosLeader : negPosTeam;
      transformed.forEach((t) => {
        const v = normalizeTo100(reverseScore(t.response, t.is_negative));
        if (t.is_negative) target.negative.push(v);
        else target.positive.push(v);
      });
    });
    const avgArr = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
    const negativeVsPositive = {
      leader: { positive: avgArr(negPosLeader.positive), negative: avgArr(negPosLeader.negative) },
      team: { positive: avgArr(negPosTeam.positive), negative: avgArr(negPosTeam.negative) }
    };

    const productMetrics = {
      gapSeverityDistribution,
      questionLevel,
      negativeVsPositive
    };

    // Benchmarks: 25th, 50th, 75th percentiles for ALI and each pattern (across companies)
    const aliSorted = companyScores.map((c) => c.score).sort((a, b) => a - b);
    const benchmarks = {
      ali: {
        p25: percentile(aliSorted, 0.25),
        p50: percentile(aliSorted, 0.5),
        p75: percentile(aliSorted, 0.75)
      }
    };
    PATTERN_KEYS.forEach((p) => {
      const vals = Object.entries(companyPatternMap)
        .map(([, pats]) => pats[p])
        .filter((v) => v != null && Number.isFinite(v));
      vals.sort((a, b) => a - b);
      benchmarks[p] = {
        p25: percentile(vals, 0.25),
        p50: percentile(vals, 0.5),
        p75: percentile(vals, 0.75)
      };
    });

    // Platform ALI trend (quarter-over-quarter)
    const platformALITrend = quarterlyTrends.map((q) => ({ quarter: q.quarter, avgALI: q.avgScore }));

    return res.status(200).json({
      ok: true,
      overview: {
        metrics: {
          companies: { 
            total: realCompanies.length, 
            active: realActiveCompanies.length, 
            inactive: realInactiveCompanies.length 
          },
          leaders: { 
            total: actualLeaderCount, 
            active: actualLeaderCount, 
            activePercent: actualLeaderCount > 0 ? 100 : 0 
          },
          surveys: { 
            total: realDeployments.length, 
            thisMonth: thisMonthDeployments.length, 
            thisQuarter: thisQuarterDeployments.length 
          },
          respondents: {
            total: totalResponses
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
        engagementDetail,
        patterns,
        topCompanies,
        leadershipMirror: {
          gaps: leadershipMirror.gaps || {},
          severity: leadershipMirror.severity || {},
          leaderScores: leadershipMirror.leaderScores || {},
          teamScores: leadershipMirror.teamScores || {}
        },
        experienceMap: experienceMap || null,
        segmentation: { byIndustry, byCompanySize },
        contentMining,
        productMetrics,
        benchmarks,
        platformALITrend
      }
    });

  } catch (error) {
    console.error('Super Admin Overview error:', error);
    console.error('Error stack:', error.stack);
    // Return empty data structure instead of error so UI can still render
    return res.status(200).json({
      ok: true,
      overview: {
        metrics: {
          companies: { total: 0, active: 0, inactive: 0 },
          leaders: { total: 0, active: 0, activePercent: 0 },
          surveys: { total: 0, thisMonth: 0, thisQuarter: 0 },
          respondents: { total: 0 },
          avgALIScore: 0
        },
        zoneDistribution: [
          { zone: 'green', range: '75-100', count: 0, percent: 0 },
          { zone: 'yellow', range: '60-74', count: 0, percent: 0 },
          { zone: 'orange', range: '45-59', count: 0, percent: 0 },
          { zone: 'red', range: '0-44', count: 0, percent: 0 }
        ],
        quarterlyTrends: [],
        engagement: {
          responseRate: 0,
          completionTime: 0,
          surveysPerCompany: 0,
          responsesPerSurvey: 0
        },
        engagementDetail: {
          cadenceMix: { S1: 0, S2: 0, S3: 0, S4: 0 },
          velocity: { avgMinutesToFirst: null, avgMinutesTo5: null, avgMinutesTo10: null },
          retention: { oneDeployment: 0, twoOrMore: 0 }
        },
        patterns: [],
        topCompanies: [],
        leadershipMirror: {
          gaps: {},
          severity: {},
          leaderScores: {},
          teamScores: {}
        },
        experienceMap: null,
        segmentation: { byIndustry: [], byCompanySize: [] },
        contentMining: {
          patternPrevalence: [],
          hardestPatterns: [],
          gapThemes: [],
          zoneTransitions: []
        },
        productMetrics: {
          gapSeverityDistribution: null,
          questionLevel: {},
          negativeVsPositive: { leader: {}, team: {} }
        },
        benchmarks: {},
        platformALITrend: []
      }
    });
  }
}
