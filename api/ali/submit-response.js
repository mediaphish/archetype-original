/**
 * ALI Survey Response Submission
 * 
 * Submit anonymous survey response
 * Validates minimum response threshold before allowing access to results
 * 
 * POST /api/ali/submit-response
 * Body: {
 *   deploymentToken: string (required)
 *   divisionId?: string (optional - which division respondent is in)
 *   respondentRole: string (required - "leader" or "team_member")
 *   responses: object (required - actual survey responses)
 *   deviceType?: string (optional - mobile, desktop, tablet)
 * }
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      deploymentToken,
      divisionId,
      respondentRole,
      responses,
      deviceType
    } = req.body || {};

    // Validation
    if (!deploymentToken) {
      return res.status(400).json({ error: 'deploymentToken is required' });
    }

    if (!respondentRole || !['leader', 'team_member'].includes(respondentRole)) {
      return res.status(400).json({ error: 'respondentRole is required and must be "leader" or "team_member"' });
    }

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'responses object is required' });
    }

    // Find deployment
    const { data: deployment } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, survey_id, company_id, division_id, status, opens_at, closes_at, minimum_responses')
      .eq('deployment_token', deploymentToken)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'Survey deployment not found' });
    }

    // Check if deployment is open
    if (deployment.status === 'closed' || deployment.status === 'archived') {
      return res.status(400).json({ error: 'This survey is no longer accepting responses' });
    }

    // Check if deployment has opened yet
    if (deployment.opens_at) {
      const opensAt = new Date(deployment.opens_at);
      if (new Date() < opensAt) {
        return res.status(400).json({ error: 'This survey is not yet open' });
      }
    }

    // Check if deployment has closed
    if (deployment.closes_at) {
      const closesAt = new Date(deployment.closes_at);
      if (new Date() > closesAt) {
        return res.status(400).json({ error: 'This survey has closed' });
      }
    }

    // If division specified, verify it belongs to the deployment's company
    let finalDivisionId = deployment.division_id || divisionId || null;

    if (divisionId && divisionId !== deployment.division_id) {
      // Verify the provided division belongs to the company
      const { data: division } = await supabaseAdmin
        .from('ali_divisions')
        .select('id, company_id')
        .eq('id', divisionId)
        .single();

      if (!division || division.company_id !== deployment.company_id) {
        return res.status(400).json({ error: 'Invalid division for this survey' });
      }

      finalDivisionId = divisionId;
    }

    // Submit response
    const { data: response, error: responseError } = await supabaseAdmin
      .from('ali_survey_responses')
      .insert({
        deployment_id: deployment.id,
        division_id: finalDivisionId,
        respondent_role: respondentRole,
        responses: responses,
        device_type: deviceType || null,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error submitting response:', responseError);
      return res.status(500).json({ error: 'Failed to submit response' });
    }

    // Count total responses for this deployment
    const { count: totalResponses } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('deployment_id', deployment.id);

    // Check if minimum threshold is met
    const thresholdMet = totalResponses >= deployment.minimum_responses;

    return res.status(201).json({
      success: true,
      response: {
        id: response.id,
        submittedAt: response.completed_at
      },
      statistics: {
        totalResponses,
        minimumRequired: deployment.minimum_responses,
        thresholdMet
      },
      message: thresholdMet 
        ? 'Response submitted successfully. Results are now available.'
        : `Response submitted successfully. ${deployment.minimum_responses - totalResponses} more response(s) needed before results are available.`
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

