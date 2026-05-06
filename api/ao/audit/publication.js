/**
 * Recent publication audit events (AO session required).
 * GET /api/ao/audit/publication?limit=50
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const rawLimit = Number(req.query?.limit ?? 50);
  const limit = Math.min(200, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_publication_audit')
      .select(
        'id, created_at, source, action, outcome, actor_email, resource_paths, detail, error_message, vercel_id, github_commit_sha'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return res.status(503).json({
          ok: false,
          error:
            'Audit table is not installed yet. Run database/ao_publication_audit.sql in Supabase, then retry.',
        });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, count: (data || []).length, events: data || [] });
  } catch (e) {
    console.error('[ao/audit/publication]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
