/**
 * ALI Deletions – Dry-run
 * POST /api/ali/admin/deletions/dry-run
 * Body: { resource_type, resource_id?, email }
 * Super-admin only. Returns counts only; no deletes.
 */

import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';
import { dryRun } from '../../../../lib/ali-deletions-execute.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (process.env.ALLOW_ALI_DELETIONS !== 'true') {
    return res.status(503).json({ ok: false, error: 'Deletions disabled' });
  }

  try {
    const body = req.body || {};
    const auth = await requireSuperAdmin(req, res, { body });
    if (!auth) return;

    const resourceType = (body.resource_type || '').trim();
    const resourceId = (body.resource_id || '').trim();

    const allowed = ['company', 'survey', 'wipe_list', 'wipe_all'];
    if (!allowed.includes(resourceType)) {
      return res.status(400).json({
        ok: false,
        error: `resource_type must be one of: ${allowed.join(', ')}`
      });
    }

    if ((resourceType === 'company' || resourceType === 'survey') && !resourceId) {
      return res.status(400).json({
        ok: false,
        error: 'resource_id required for company or survey'
      });
    }

    const { summary } = await dryRun(resourceType, resourceId || null);
    return res.status(200).json({ ok: true, summary });
  } catch (e) {
    console.error('[ali-deletions dry-run]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Dry-run failed' });
  }
}
