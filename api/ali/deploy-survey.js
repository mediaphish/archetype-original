/**
 * ALI Survey Deployment
 * 
 * Create a survey deployment for a company/division
 * Generates unique token for survey link
 * 
 * POST /api/ali/deploy-survey
 * Body: {
 *   surveyId: string (required)
 *   companyId: string (required)
 *   divisionId?: string (null = company-wide)
 *   opensAt?: string (ISO timestamp - when company chooses to open)
 *   closesAt?: string (ISO timestamp - optional closing date)
 *   minimumResponses?: number (default: 5)
 * }
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { randomBytes } from 'crypto';

function generateDeploymentToken() {
  // Generate a secure, URL-safe token
  return randomBytes(32).toString('base64url');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      surveyId,
      companyId,
      divisionId,
      opensAt,
      closesAt,
      minimumResponses = 5
    } = req.body || {};

    // Validation
    if (!surveyId) {
      return res.status(400).json({ error: 'surveyId is required' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Verify survey exists and is active
    const { data: survey } = await supabaseAdmin
      .from('ali_surveys')
      .select('id, name, status')
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.status !== 'active' && survey.status !== 'draft') {
      return res.status(400).json({ error: 'Survey is not available for deployment' });
    }

    // Verify company exists
    const { data: company } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // If division specified, verify it exists and belongs to company
    if (divisionId) {
      const { data: division } = await supabaseAdmin
        .from('ali_divisions')
        .select('id, company_id, name, status')
        .eq('id', divisionId)
        .single();

      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }

      if (division.company_id !== companyId) {
        return res.status(400).json({ error: 'Division does not belong to this company' });
      }

      if (division.status !== 'active') {
        return res.status(400).json({ error: 'Division is not active' });
      }
    }

    // Generate unique deployment token
    let deploymentToken;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      deploymentToken = generateDeploymentToken();
      const { data: existing } = await supabaseAdmin
        .from('ali_survey_deployments')
        .select('id')
        .eq('deployment_token', deploymentToken)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique deployment token' });
    }

    // Create deployment
    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .insert({
        survey_id: surveyId,
        company_id: companyId,
        division_id: divisionId || null,
        deployment_token: deploymentToken,
        status: opensAt ? 'pending' : 'active',
        opens_at: opensAt || null,
        closes_at: closesAt || null,
        minimum_responses: minimumResponses
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment:', deploymentError);
      return res.status(500).json({ error: 'Failed to create survey deployment' });
    }

    // Build survey URL
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
    const surveyUrl = `${siteUrl}/ali/survey/${deploymentToken}`;

    return res.status(201).json({
      success: true,
      deployment: {
        id: deployment.id,
        surveyId: deployment.survey_id,
        companyId: deployment.company_id,
        divisionId: deployment.division_id,
        status: deployment.status,
        opensAt: deployment.opens_at,
        closesAt: deployment.closes_at,
        minimumResponses: deployment.minimum_responses,
        surveyUrl
      },
      message: 'Survey deployment created successfully'
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

