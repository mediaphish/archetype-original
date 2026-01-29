/**
 * ALI Deletions – shared dry-run and execute logic
 * FK-safe order: responses → deployments → snapshots → contacts, divisions → null applications → companies.
 * Resource types: company | survey | wipe_list | wipe_all.
 */

import { supabaseAdmin } from './supabase-admin.js';

const WIPE_IDS = (process.env.ALI_WIPE_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const WIPE_NAMES = (process.env.ALI_WIPE_NAMES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Resolve affected company IDs and deployment IDs for dry-run/execute.
 * @returns { Promise<{ companyIds: string[], deploymentIds: string[], surveyOnly: boolean }> }
 */
async function resolveAffected(resourceType, resourceId) {
  if (resourceType === 'company') {
    const id = (resourceId || '').trim();
    if (!id) return { companyIds: [], deploymentIds: [], surveyOnly: false };
    const { data: dep } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id')
      .eq('company_id', id);
    const deploymentIds = (dep || []).map((d) => d.id);
    return { companyIds: [id], deploymentIds, surveyOnly: false };
  }

  if (resourceType === 'survey') {
    const id = (resourceId || '').trim();
    if (!id) return { companyIds: [], deploymentIds: [], surveyOnly: true };
    return { companyIds: [], deploymentIds: [id], surveyOnly: true };
  }

  if (resourceType === 'wipe_list') {
    const companyIds = [];
    if (WIPE_IDS.length) {
      const { data: byId } = await supabaseAdmin
        .from('ali_companies')
        .select('id')
        .in('id', WIPE_IDS);
      (byId || []).forEach((r) => companyIds.push(r.id));
    }
    if (WIPE_NAMES.length) {
      const { data: byName } = await supabaseAdmin
        .from('ali_companies')
        .select('id')
        .in('name', WIPE_NAMES);
      (byName || []).forEach((r) => {
        if (!companyIds.includes(r.id)) companyIds.push(r.id);
      });
    }
    const deploymentIds = [];
    if (companyIds.length) {
      const { data: dep } = await supabaseAdmin
        .from('ali_survey_deployments')
        .select('id')
        .in('company_id', companyIds);
      (dep || []).forEach((d) => deploymentIds.push(d.id));
    }
    return { companyIds, deploymentIds, surveyOnly: false };
  }

  if (resourceType === 'wipe_all') {
    const { data: companies } = await supabaseAdmin.from('ali_companies').select('id');
    const companyIds = (companies || []).map((c) => c.id);
    const deploymentIds = [];
    if (companyIds.length) {
      const { data: dep } = await supabaseAdmin
        .from('ali_survey_deployments')
        .select('id')
        .in('company_id', companyIds);
      (dep || []).forEach((d) => deploymentIds.push(d.id));
    }
    return { companyIds, deploymentIds, surveyOnly: false };
  }

  return { companyIds: [], deploymentIds: [], surveyOnly: false };
}

/**
 * Dry-run: return counts only, no deletes.
 * @returns { Promise<{ summary: object }> }
 */
export async function dryRun(resourceType, resourceId) {
  const { companyIds, deploymentIds, surveyOnly } = await resolveAffected(resourceType, resourceId);

  if (surveyOnly) {
    const { count: responses } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('*', { count: 'exact', head: true })
      .in('deployment_id', deploymentIds);
    return {
      summary: {
        resource_type: 'survey',
        deployment_ids: deploymentIds,
        responses: responses ?? 0,
        deployments: deploymentIds.length
      }
    };
  }

  let responses = 0;
  if (deploymentIds.length) {
    const { count } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('*', { count: 'exact', head: true })
      .in('deployment_id', deploymentIds);
    responses = count ?? 0;
  }
  const { count: deployments } = await supabaseAdmin
    .from('ali_survey_deployments')
    .select('*', { count: 'exact', head: true })
    .in('company_id', companyIds);
  const { count: snapshots } = await supabaseAdmin
    .from('ali_survey_snapshots')
    .select('*', { count: 'exact', head: true })
    .in('client_id', companyIds);
  const { count: contacts } = await supabaseAdmin
    .from('ali_contacts')
    .select('*', { count: 'exact', head: true })
    .in('company_id', companyIds);
  const { count: divisions } = await supabaseAdmin
    .from('ali_divisions')
    .select('*', { count: 'exact', head: true })
    .in('company_id', companyIds);

  const byCompany = [];
  const { data: deplByCo } = await supabaseAdmin
    .from('ali_survey_deployments')
    .select('id, company_id')
    .in('company_id', companyIds);
  const deploymentIdsByCompany = {};
  (deplByCo || []).forEach((d) => {
    if (!deploymentIdsByCompany[d.company_id]) deploymentIdsByCompany[d.company_id] = [];
    deploymentIdsByCompany[d.company_id].push(d.id);
  });
  for (const cid of companyIds) {
    const { data: co } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name')
      .eq('id', cid)
      .maybeSingle();
    if (resourceType === 'company' && companyIds.length === 1 && !co) {
      throw new Error(`Company not found: ${cid}`);
    }
    const dids = deploymentIdsByCompany[cid] || [];
    let r = 0;
    if (dids.length) {
      const { count } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('*', { count: 'exact', head: true })
        .in('deployment_id', dids);
      r = count ?? 0;
    }
    const { count: snap } = await supabaseAdmin
      .from('ali_survey_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', cid);
    const { count: cont } = await supabaseAdmin
      .from('ali_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', cid);
    const { count: div } = await supabaseAdmin
      .from('ali_divisions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', cid);
    byCompany.push({
      companyId: cid,
      companyName: (co && co.name) || null,
      responses: r,
      deployments: dids.length,
      snapshots: snap ?? 0,
      contacts: cont ?? 0,
      divisions: div ?? 0
    });
  }

  const first = byCompany[0];
  const out = {
    resource_type: resourceType,
    company_ids: companyIds,
    responses,
    deployments: deployments ?? 0,
    snapshots: snapshots ?? 0,
    contacts: contacts ?? 0,
    divisions: divisions ?? 0,
    companies: companyIds.length,
    by_company: byCompany.length ? byCompany : undefined
  };
  if (resourceType === 'company' && first) {
    out.companyId = first.companyId;
    out.companyName = first.companyName;
  }
  return { summary: out };
}

/**
 * Execute deletes in FK-safe order. Returns { deleted: summary }.
 */
export async function execute(resourceType, resourceId) {
  const { companyIds, deploymentIds, surveyOnly } = await resolveAffected(resourceType, resourceId);

  if (surveyOnly) {
    let responsesCount = 0;
    if (deploymentIds.length) {
      const { count } = await supabaseAdmin
        .from('ali_survey_responses')
        .select('*', { count: 'exact', head: true })
        .in('deployment_id', deploymentIds);
      responsesCount = count ?? 0;
      const { error: er } = await supabaseAdmin
        .from('ali_survey_responses')
        .delete()
        .in('deployment_id', deploymentIds);
      if (er) throw new Error(`Delete responses: ${er.message}`);
    }
    for (const did of deploymentIds) {
      const { error: ed } = await supabaseAdmin.from('ali_survey_deployments').delete().eq('id', did);
      if (ed) throw new Error(`Delete deployment: ${ed.message}`);
    }
    return {
      deleted: {
        resource_type: 'survey',
        responses: responsesCount,
        deployments: deploymentIds.length
      }
    };
  }

  if (!companyIds.length) {
    return { deleted: { resource_type: resourceType, companies: 0, responses: 0, deployments: 0, snapshots: 0, contacts: 0, divisions: 0 } };
  }

  let responsesDeleted = 0;
  if (deploymentIds.length) {
    const { count } = await supabaseAdmin
      .from('ali_survey_responses')
      .select('*', { count: 'exact', head: true })
      .in('deployment_id', deploymentIds);
    responsesDeleted = count ?? 0;
    const { error: er } = await supabaseAdmin
      .from('ali_survey_responses')
      .delete()
      .in('deployment_id', deploymentIds);
    if (er) throw new Error(`Delete responses: ${er.message}`);
  }

  const { error: ed } = await supabaseAdmin
    .from('ali_survey_deployments')
    .delete()
    .in('company_id', companyIds);
  if (ed) throw new Error(`Delete deployments: ${ed.message}`);

  const { error: es } = await supabaseAdmin
    .from('ali_survey_snapshots')
    .delete()
    .in('client_id', companyIds);
  if (es) throw new Error(`Delete snapshots: ${es.message}`);

  const { error: ec } = await supabaseAdmin
    .from('ali_contacts')
    .delete()
    .in('company_id', companyIds);
  if (ec) throw new Error(`Delete contacts: ${ec.message}`);

  const { error: ediv } = await supabaseAdmin
    .from('ali_divisions')
    .delete()
    .in('company_id', companyIds);
  if (ediv) throw new Error(`Delete divisions: ${ediv.message}`);

  const { error: eapp } = await supabaseAdmin
    .from('ali_applications')
    .update({ converted_to_company_id: null })
    .in('converted_to_company_id', companyIds);
  if (eapp) throw new Error(`Null applications: ${eapp.message}`);

  const { error: eco } = await supabaseAdmin
    .from('ali_companies')
    .delete()
    .in('id', companyIds);
  if (eco) throw new Error(`Delete companies: ${eco.message}`);

  return {
    deleted: {
      resource_type: resourceType,
      company_ids: companyIds,
      responses: responsesDeleted,
      deployments: deploymentIds.length,
      companies: companyIds.length
    }
  };
}
