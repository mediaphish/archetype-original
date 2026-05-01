/**
 * ALI Narrative Admin: Clusters
 *
 * Lists narrative clusters within a tenant. Currently a thin grouping view
 * over `ali_narratives.cluster_id` so admins can see how the moderation
 * pipeline is grouping similar stories. The actual clustering policy lives
 * in lib/narrativeClustering.js (shared with BLP) and runs in a separate
 * worker, not here — this endpoint is read-only.
 *
 * GET /api/ali/narrative/admin/clusters?tenantId=...
 *
 * Auth: super admin
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const tenantId = (req.query?.tenantId || '').toString();

  let query = supabaseAdmin
    .from('ali_narratives')
    .select('id, tenant_id, deployment_id, condition, cluster_id, moderation_status, is_visible, created_at')
    .order('cluster_id', { ascending: true });

  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) {
    console.error('[ali/narrative/admin/clusters] error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load clusters' });
  }

  const grouped = new Map();
  for (const row of data || []) {
    const key = row.cluster_id || '__unclustered__';
    if (!grouped.has(key)) {
      grouped.set(key, {
        cluster_id: row.cluster_id || null,
        narrative_ids: [],
        approved_count: 0,
        visible_count: 0,
        condition_counts: {},
      });
    }
    const c = grouped.get(key);
    c.narrative_ids.push(row.id);
    if (row.moderation_status === 'approved') c.approved_count += 1;
    if (row.is_visible) c.visible_count += 1;
    if (row.condition) {
      c.condition_counts[row.condition] = (c.condition_counts[row.condition] || 0) + 1;
    }
  }

  return res.status(200).json({ ok: true, clusters: Array.from(grouped.values()) });
}
