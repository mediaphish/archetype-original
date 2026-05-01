/**
 * ALI Narrative Admin: Queue
 *
 * Lists narratives pending moderation and the most recent decisions.
 *
 * GET /api/ali/narrative/admin/queue?status=pending&tenantId=...&deploymentId=...
 *
 * Auth: super admin (Ali-Super-Admin-Email header or ?email=...)
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const status = (req.query?.status || 'pending').toString();
  const tenantId = (req.query?.tenantId || '').toString();
  const deploymentId = (req.query?.deploymentId || '').toString();
  const limit = Math.min(200, Math.max(1, parseInt(req.query?.limit || '100', 10) || 100));

  let query = supabaseAdmin
    .from('ali_narratives')
    .select(
      'id, tenant_id, deployment_id, trigger_type, condition, text, language, reading_grade, moderation_status, is_visible, cluster_id, created_at, moderated_at, exposed_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') query = query.eq('moderation_status', status);
  if (tenantId) query = query.eq('tenant_id', tenantId);
  if (deploymentId) query = query.eq('deployment_id', deploymentId);

  const { data, error } = await query;
  if (error) {
    console.error('[ali/narrative/admin/queue] query error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load narratives' });
  }

  return res.status(200).json({ ok: true, narratives: data || [] });
}
