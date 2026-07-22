/**
 * Weekly Intelligence Generation Cron Job
 * 
 * Runs every Monday at 9am UTC to scan ALI data for leadership signals
 * and generate intelligence items for Super Admin review.
 * 
 * Configured in vercel.json (see crons → generate-intelligence; currently 0 9 * * 1).
 * 
 * Detects:
 * - Companies with significant ALI score drops
 * - Large leadership mirror gaps (leader vs team perception)
 * - Low engagement patterns (few responses relative to team size)
 * - Recent deployments with no responses
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import {
  calculateALIScore,
  calculatePatternScore,
  calculateAnchorScore,
  classifyZone,
  calculatePerceptionGap,
  classifyGapSeverity
} from '../../lib/ali-scoring.js';
import { CONDITION_KEYS, CONDITION_LABELS } from '../../lib/ali-conditions.js';

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

function getWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || 
                       req.headers['authorization']?.startsWith('Bearer');
  
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    console.warn('⚠️  No Vercel cron headers detected - allowing for testing');
  }

  try {
    console.log('🔍 Starting weekly intelligence generation...');
    const weekKey = getWeekKey();
    let itemsCreated = 0;

    // Load question bank
    const { data: questionBankData, error: qbError } = await supabaseAdmin
      .from('ali_question_bank')
      .select('stable_id, pattern, is_negative, is_anchor, role')
      .eq('status', 'active');

    if (qbError || !questionBankData) {
      console.error('Error loading question bank:', qbError);
      return res.status(500).json({ ok: false, error: 'Failed to load question bank' });
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

    // Get active companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, status')
      .or('status.eq.active,status.is.null');

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch companies' });
    }

    if (!companies || companies.length === 0) {
      console.log('✅ No active companies found.');
      return res.status(200).json({ ok: true, items_created: 0, message: 'No active companies' });
    }

    // Get all deployments for these companies
    const companyIds = companies.map(c => c.id);
    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, company_id, survey_index, created_at, status')
      .in('company_id', companyIds)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      console.error('Error fetching deployments:', deploymentsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch deployments' });
    }

    // Get all responses
    const deploymentIds = (deployments || []).map(d => d.id);
    let allResponses = [];
    if (deploymentIds.length > 0) {
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('id, deployment_id, responses, respondent_role, completed_at')
        .in('deployment_id', deploymentIds);

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
      } else {
        allResponses = responses || [];
      }
    }

    // Build deployment -> company map
    const deploymentToCompany = {};
    (deployments || []).forEach(d => {
      deploymentToCompany[d.id] = d.company_id;
    });

    // Group responses by company
    const responsesByCompany = {};
    allResponses.forEach(r => {
      const companyId = deploymentToCompany[r.deployment_id];
      if (!companyId) return;
      if (!responsesByCompany[companyId]) responsesByCompany[companyId] = [];
      responsesByCompany[companyId].push(r);
    });

    // Process each company for signals
    for (const company of companies) {
      const companyResponses = responsesByCompany[company.id] || [];
      
      if (companyResponses.length === 0) {
        // Check for stale deployments (no responses after 7+ days)
        const companyDeployments = (deployments || []).filter(d => d.company_id === company.id);
        const staleDeployment = companyDeployments.find(d => {
          const createdAt = new Date(d.created_at);
          const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince >= 7 && d.status === 'active';
        });

        if (staleDeployment) {
          const dedupeKey = `${company.id}:no_responses:${weekKey}`;
          await insertIntelligenceItem({
            company_id: company.id,
            company_name: company.name,
            priority: 'MEDIUM',
            type: 'deployment feedback',
            description: `Survey deployment has been active for 7+ days with no responses. This may indicate team disengagement or deployment issues.`,
            recommendations: [
              'Follow up with the leader to confirm the survey was communicated to the team',
              'Check if there are technical barriers preventing responses',
              'Consider resending the survey invitation'
            ],
            conclusion: 'Early intervention can improve response rates and engagement.',
            dedupe_key: dedupeKey
          });
          itemsCreated++;
        }
        continue;
      }

      // Calculate current ALI score
      const leaderResponses = companyResponses.filter(r => r.respondent_role === 'leader');
      const teamResponses = companyResponses.filter(r => r.respondent_role === 'team_member');

      const allTransformed = [];
      companyResponses.forEach(r => {
        const role = r.respondent_role || 'team_member';
        const transformed = transformResponsesForScoring(r.responses, questionBank, role);
        allTransformed.push(...transformed);
      });

      if (allTransformed.length === 0) continue;

      // Calculate pattern scores and ALI
      const patternScores = {};
      CONDITION_KEYS.forEach(p => {
        patternScores[p] = calculatePatternScore(allTransformed, p);
      });
      const anchorScore = calculateAnchorScore(allTransformed);
      const aliScore = calculateALIScore(patternScores, anchorScore);

      // Signal 1: Large leadership mirror gaps
      if (leaderResponses.length > 0 && teamResponses.length > 0) {
        const leaderTransformed = [];
        leaderResponses.forEach(r => {
          leaderTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'leader'));
        });
        
        const teamTransformed = [];
        teamResponses.forEach(r => {
          teamTransformed.push(...transformResponsesForScoring(r.responses, questionBank, 'team_member'));
        });

        if (leaderTransformed.length > 0 && teamTransformed.length > 0) {
          const leaderPatterns = {};
          const teamPatterns = {};
          CONDITION_KEYS.forEach(p => {
            leaderPatterns[p] = calculatePatternScore(leaderTransformed, p);
            teamPatterns[p] = calculatePatternScore(teamTransformed, p);
          });

          // Find the largest perception gap
          let maxGap = 0;
          let maxGapPattern = null;
          CONDITION_KEYS.forEach(p => {
            if (p === 'leadership_drift') return;
            const leaderScore = leaderPatterns[p] || 0;
            const teamScore = teamPatterns[p] || 0;
            const gap = leaderScore - teamScore;
            if (gap > maxGap) {
              maxGap = gap;
              maxGapPattern = p;
            }
          });

          if (maxGap >= 15 && maxGapPattern) {
            const dedupeKey = `${company.id}:perception_gap:${weekKey}`;
            const patternLabel = CONDITION_LABELS[maxGapPattern] || maxGapPattern;
            await insertIntelligenceItem({
              company_id: company.id,
              company_name: company.name,
              priority: maxGap >= 20 ? 'HIGH' : 'MEDIUM',
              type: 'leadership challenge',
              metrics: {
                aliScore: Math.round(aliScore * 10) / 10,
                pattern: patternLabel,
                gap: Math.round(maxGap)
              },
              description: `Leadership assessment data shows a ${Math.round(maxGap)}-point gap between leader self-perception and team reality in ${patternLabel}. This indicates a significant blind spot.`,
              recommendations: [
                `Schedule a focused conversation about ${patternLabel} expectations`,
                'Implement regular feedback loops with the team',
                'Document specific behaviors that can bridge this perception gap'
              ],
              conclusion: 'Large perception gaps often indicate communication breakdowns that compound over time if not addressed.',
              dedupe_key: dedupeKey
            });
            itemsCreated++;
          }
        }
      }

      // Signal 2: Low ALI score (red/orange zone)
      const zone = classifyZone(aliScore);
      if (zone === 'red' || zone === 'orange') {
        // Find the lowest pattern
        let lowestPattern = null;
        let lowestScore = 100;
        CONDITION_KEYS.forEach(p => {
          const score = patternScores[p];
          const effectiveScore = p === 'leadership_drift' ? (100 - score) : score;
          if (effectiveScore < lowestScore) {
            lowestScore = effectiveScore;
            lowestPattern = p;
          }
        });

        if (lowestPattern) {
          const dedupeKey = `${company.id}:low_ali:${weekKey}`;
          const patternLabel = CONDITION_LABELS[lowestPattern] || lowestPattern;
          await insertIntelligenceItem({
            company_id: company.id,
            company_name: company.name,
            priority: zone === 'red' ? 'HIGH' : 'MEDIUM',
            type: 'leadership challenge',
            metrics: {
              aliScore: Math.round(aliScore * 10) / 10,
              pattern: patternLabel,
              gap: null
            },
            description: `Company ALI score is in the ${zone} zone at ${Math.round(aliScore)}. The weakest area is ${patternLabel} at ${Math.round(lowestScore)}.`,
            recommendations: [
              `Focus improvement efforts on ${patternLabel} as the primary constraint`,
              'Review specific survey feedback related to this pattern',
              'Develop targeted interventions for the team'
            ],
            conclusion: `Teams in the ${zone} zone require proactive support to prevent further decline.`,
            dedupe_key: dedupeKey
          });
          itemsCreated++;
        }
      }
    }

    console.log(`✅ Intelligence generation complete. Created ${itemsCreated} items.`);
    return res.status(200).json({ 
      ok: true, 
      items_created: itemsCreated,
      week: weekKey
    });

  } catch (error) {
    console.error('❌ Intelligence generation error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Server error during intelligence generation',
      details: error.message 
    });
  }
}

async function insertIntelligenceItem(item) {
  try {
    // Check for existing item with same dedupe key
    if (item.dedupe_key) {
      const { data: existing } = await supabaseAdmin
        .from('ali_intelligence_items')
        .select('id')
        .eq('dedupe_key', item.dedupe_key)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️ Skipping duplicate: ${item.dedupe_key}`);
        return;
      }
    }

    const { error } = await supabaseAdmin
      .from('ali_intelligence_items')
      .insert({
        company_id: item.company_id,
        company_name: item.company_name,
        leader_name: item.leader_name || null,
        priority: item.priority,
        type: item.type,
        metrics: item.metrics || null,
        description: item.description,
        recommendations: item.recommendations || [],
        conclusion: item.conclusion || null,
        dedupe_key: item.dedupe_key || null
      });

    if (error) {
      console.error('Error inserting intelligence item:', error);
    } else {
      console.log(`📝 Created intelligence item for ${item.company_name}: ${item.type}`);
    }
  } catch (err) {
    console.error('Error in insertIntelligenceItem:', err);
  }
}
