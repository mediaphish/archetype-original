/**
 * ALI Narrative Admin: Expose
 *
 * Flips visibility for narratives once the per-(deployment, condition)
 * approved-count meets the configured N-threshold AND the deployment is
 * past the small-tenant guardrail. See notes/ali-narrative-privacy.md for
 * the rules and `lib/ali-narrative-privacy.js` for the helper that gates
 * exposure.
 *
 * POST /api/ali/narrative/admin/expose
 * Body: {
 *   email: string (super admin),
 *   deploymentId: string (required),
 *   condition?: string,            // omit to evaluate all conditions
 *   force?: boolean                // if true, expose regardless of threshold (audit-logged)
 * }
 *
 * Returns:
 *   { ok: true, exposed: [{ narrative_id, condition }], skipped: [{ reason, condition }] }
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';
import {
  evaluateExposureGate,
  getPrivacyConfig,
} from '../../../../lib/ali-narrative-privacy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const session = await requireSuperAdmin(req, res, { body });
  if (!session) return;

  const { deploymentId, condition, force } = body;
  if (!deploymentId) {
    return res.status(400).json({ ok: false, error: 'deploymentId is required' });
  }

  const config = getPrivacyConfig();

  const { data: deployment, error: depErr } = await supabaseAdmin
    .from('ali_survey_deployments')
    .select('id, company_id')
    .eq('id', deploymentId)
    .maybeSingle();
  if (depErr || !deployment) {
    return res.status(404).json({ ok: false, error: 'Deployment not found' });
  }

  const { count: respondentCount } = await supabaseAdmin
    .from('ali_survey_responses')
    .select('*', { count: 'exact', head: true })
    .eq('deployment_id', deploymentId);

  let conditionsQuery = supabaseAdmin
    .from('ali_narratives')
    .select('condition')
    .eq('deployment_id', deploymentId)
    .eq('moderation_status', 'approved');
  if (condition) conditionsQuery = conditionsQuery.eq('condition', condition);
  const { data: conditionRows, error: conditionErr } = await conditionsQuery;
  if (conditionErr) {
    return res.status(500).json({ ok: false, error: 'Failed to load conditions' });
  }
  const conditionsToEvaluate = condition
    ? [condition]
    : Array.from(new Set((conditionRows || []).map((r) => r.condition).filter(Boolean)));

  if (conditionsToEvaluate.length === 0) {
    return res.status(200).json({ ok: true, exposed: [], skipped: [{ reason: 'no_approved_narratives', condition: null }] });
  }

  const exposed = [];
  const skipped = [];

  for (const cond of conditionsToEvaluate) {
    const { data: candidates, error: candErr } = await supabaseAdmin
      .from('ali_narratives')
      .select('id, is_visible')
      .eq('deployment_id', deploymentId)
      .eq('condition', cond)
      .eq('moderation_status', 'approved');
    if (candErr) {
      console.error('[ali/narrative/admin/expose] candidates error:', candErr);
      continue;
    }

    const approvedCount = (candidates || []).length;
    const gate = evaluateExposureGate({
      approvedCount,
      respondentCount: respondentCount || 0,
      config,
    });

    if (!gate.allowed && !force) {
      skipped.push({ condition: cond, reason: gate.reason, ...gate.details });
      continue;
    }

    const ids = (candidates || []).filter((c) => !c.is_visible).map((c) => c.id);
    if (ids.length === 0) {
      skipped.push({ condition: cond, reason: 'already_visible' });
      continue;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('ali_narratives')
      .update({ is_visible: true, exposed_at: new Date().toISOString() })
      .in('id', ids);
    if (updateErr) {
      console.error('[ali/narrative/admin/expose] update error:', updateErr);
      skipped.push({ condition: cond, reason: 'db_error' });
      continue;
    }

    for (const nid of ids) {
      await supabaseAdmin.from('ali_narrative_audit').insert({
        narrative_id: nid,
        action: 'exposed',
        actor: session.email,
        notes: force ? 'forced exposure (audit-logged override)' : `gate=${gate.reason}`,
      });
      exposed.push({ narrative_id: nid, condition: cond });
    }
  }

  return res.status(200).json({ ok: true, exposed, skipped });
}
