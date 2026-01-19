/**
 * ALI Next Survey Info
 * 
 * Get information about the next survey to deploy
 * 
 * GET /api/ali/deploy/next?companyId=xxx
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { calculateAvailableAt, getNextSurveyIndex } from '../../../lib/ali-cadence.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyId: companyIdParam, email: emailParam } = req.query;

    // Allow resolving companyId via email for the current lightweight auth approach
    let companyId = companyIdParam;
    if (!companyId && emailParam) {
      const email = String(emailParam).toLowerCase().trim();
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('ali_contacts')
        .select('company_id')
        .eq('email', email)
        .maybeSingle();

      if (contactError) {
        console.error('Error resolving company by email:', contactError);
      }

      companyId = contact?.company_id || null;
    }

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required (or provide email)' });
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

    // Get existing survey snapshots to determine next survey
    const { data: existingSurveys, error: surveysError } = await supabaseAdmin
      .from('ali_survey_snapshots')
      .select('survey_index')
      .eq('client_id', companyId)
      .eq('instrument_version', 'v1.0');

    if (surveysError) {
      console.error('Error fetching existing surveys:', surveysError);
      return res.status(500).json({ error: 'Failed to fetch survey history' });
    }

    // Determine next survey index
    const nextSurveyIndex = getNextSurveyIndex(existingSurveys || []);

    // Calculate available date from baseline_date
    let availableOn = null;
    let canDeploy = false;
    let reason = null;

    if (company.baseline_date) {
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
      reason
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

