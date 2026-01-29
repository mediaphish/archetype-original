/**
 * ALI Deletions – Initiate (runs execute)
 * POST /api/ali/admin/deletions/initiate
 * Body: { resource_type, resource_id?, reason?, confirm_wipe_all?, email }
 * Super-admin only. For wipe_all: require confirm_wipe_all === true and ALLOW_ALI_FULL_WIPE.
 */

import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';
import { execute } from '../../../../lib/ali-deletions-execute.js';

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
    const confirmWipeAll = body.confirm_wipe_all === true;

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

    if (resourceType === 'wipe_all') {
      if (process.env.ALLOW_ALI_FULL_WIPE !== 'true') {
        return res.status(403).json({
          ok: false,
          error: 'Wipe all is not enabled (ALLOW_ALI_FULL_WIPE)'
        });
      }
      if (!confirmWipeAll) {
        return res.status(403).json({
          ok: false,
          error: 'confirm_wipe_all must be true to execute wipe all'
        });
      }
    }

    const { deleted } = await execute(resourceType, resourceId || null);
    return res.status(200).json({ ok: true, deleted });
  } catch (e) {
    console.error('[ali-deletions initiate]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Initiate failed' });
  }
}
