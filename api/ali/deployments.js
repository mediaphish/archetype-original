/**
 * ALI List Deployments
 *
 * Returns company deployments with tokens and response counts for Deploy page "View Link".
 *
 * GET /api/ali/deployments?email=... or ?companyId=...
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { companyId: companyIdParam, email: emailParam } = req.query;

    let companyId = companyIdParam;
    if (!companyId && emailParam) {
      const email = String(emailParam).toLowerCase().trim();
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('ali_contacts')
        .select('company_id')
        .eq('email', email)
        .maybeSingle();

      if (contactError) {
        console.error('[deployments] Error resolving company by email:', contactError);
      }
      companyId = contact?.company_id || null;
    }

    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'companyId is required (or provide email)' });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ ok: false, error: 'Company not found' });
    }

    const { data: deployments, error: deploymentsError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, survey_index, status, deployment_token, opens_at, closes_at, minimum_responses, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (deploymentsError) {
      console.error('[deployments] Error fetching deployments:', deploymentsError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch deployments' });
    }

    if (!deployments || deployments.length === 0) {
      return res.status(200).json({ ok: true, deployments: [] });
    }

    const deploymentIds = deployments.map((d) => d.id);

    const { data: countsRows, error: countsError } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('deployment_id')
      .in('deployment_id', deploymentIds);

    if (countsError) {
      console.error('[deployments] Error fetching response counts:', countsError);
    }

    const countByDeployment = {};
    for (const row of countsRows || []) {
      const id = row.deployment_id;
      countByDeployment[id] = (countByDeployment[id] || 0) + 1;
    }

    const list = deployments.map((d) => ({
      id: d.id,
      surveyIndex: d.survey_index,
      status: d.status,
      deploymentToken: d.deployment_token,
      opensAt: d.opens_at ? d.opens_at.split('T')[0] : null,
      closesAt: d.closes_at ? d.closes_at.split('T')[0] : null,
      minimumResponses: d.minimum_responses ?? 5,
      responseCount: countByDeployment[d.id] ?? 0,
      createdAt: d.created_at
    }));

    return res.status(200).json({ ok: true, deployments: list });
  } catch (err) {
    console.error('[deployments] Error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
