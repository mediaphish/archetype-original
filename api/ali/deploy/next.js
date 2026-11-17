/**
 * ALI Next Survey Info
 * 
 * Get information about the next survey to deploy
 * 
 * GET /api/ali/deploy/next?companyId=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { calculateAvailableAt } from '../../../lib/ali-cadence.js';
import { nextRoundNumber, listV3Deployments, roundStatus } from '../../../lib/ali-v3-rounds.js';
import { requireAliSession } from '../../../lib/ali-session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireAliSession(req, res);
  if (!session) return;

  if (session.isSuperAdmin && !session.companyId) {
    return res.status(403).json({ ok: false, error: 'This action requires a tenant account.' });
  }

  try {
    const companyId = session.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Get company info
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, baseline_date')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Round numbering counts every earlier round for the company, whatever instrument it used.
    let nextSurveyIndex;
    let openRound = null;
    try {
      nextSurveyIndex = `S${await nextRoundNumber(companyId)}`;
      openRound = (await listV3Deployments(companyId)).find((d) => roundStatus(d) === 'open') || null;
    } catch (e) {
      console.error('Error counting earlier rounds:', e?.message || e);
      return res.status(500).json({ error: 'Failed to fetch survey history' });
    }

    // Calculate available date from baseline_date
    let availableOn = null;
    let canDeploy = false;
    let reason = null;

    if (nextSurveyIndex === 'S1') {
      // Business rule: first survey is always deployable immediately.
      // Cadence anchor is set at deployment time.
      canDeploy = true;
      availableOn = new Date().toISOString().split('T')[0];
      reason = null;
    } else if (company.baseline_date) {
      const availableAt = calculateAvailableAt(company.baseline_date, nextSurveyIndex);
      availableOn = availableAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if survey is available now
      const now = new Date();
      canDeploy = now >= availableAt;
      
      if (!canDeploy) {
        reason = `Survey will be available on ${availableOn}`;
      }
    } else {
      // No baseline_date set - can deploy S1 immediately
      if (nextSurveyIndex === 'S1') {
        canDeploy = true;
        availableOn = new Date().toISOString().split('T')[0];
      } else {
        reason = 'Baseline date must be set before deploying subsequent surveys';
      }
    }

    if (openRound) {
      canDeploy = false;
      reason = `Round ${openRound.round_number} is still open. Close it before starting a new one.`;
    }

    // Extract quarter and year from available date
    let quarter = null;
    let year = null;
    
    if (availableOn) {
      const date = new Date(availableOn);
      year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      
      if (month >= 1 && month <= 3) quarter = 'Q1';
      else if (month >= 4 && month <= 6) quarter = 'Q2';
      else if (month >= 7 && month <= 9) quarter = 'Q3';
      else quarter = 'Q4';
    }

    return res.status(200).json({
      next_survey_index: nextSurveyIndex,
      quarter,
      year,
      available_on: availableOn,
      baseline_date: company.baseline_date,
      can_deploy: canDeploy,
      reason,
      open_round: openRound ? openRound.round_number : null
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

