/**
 * ALI Admin – Tenants list
 * GET /api/ali/admin/tenants?email=...
 * Super-admin only. Returns { ok: true, tenants } from ali_companies.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireSuperAdmin } from '../../../lib/ali-admin-auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const auth = await requireSuperAdmin(req, res, {});
    if (!auth) return;

    const { data: rows, error } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, created_at, status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ali-admin tenants]', error);
      return res.status(500).json({ ok: false, error: 'Failed to fetch tenants' });
    }

    const tenants = (rows || []).map((r) => ({
      id: r.id,
      companyName: r.name,
      created_at: r.created_at,
      status: r.status || 'active'
    }));

    return res.status(200).json({ ok: true, tenants });
  } catch (e) {
    console.error('[ali-admin tenants]', e);
    return res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
}
