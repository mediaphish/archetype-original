/**
 * AO Automation Dashboard — List scheduled posts.
 * GET /api/ao/scheduled-posts?status=xxx&limit=50
 * Owner-only session required. Optional: status (scheduled|publishing|posted|failed), limit, from, to.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAoSession } from '../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const status = req.query?.status || null;
  const limit = Math.min(Number(req.query?.limit) || 50, 100);
  const from = req.query?.from || null;
  const to = req.query?.to || null;

  let query = supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, scheduled_at, text, image_url, status, external_id, error_message, first_comment, first_comment_status, first_comment_error_message, created_at, updated_at')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }
  if (from) {
    query = query.gte('scheduled_at', from);
  }
  if (to) {
    query = query.lte('scheduled_at', to);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(200).json({ ok: true, posts: data || [] });
}
