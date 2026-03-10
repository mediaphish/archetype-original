/**
 * AO Automation Dashboard — List scheduled posts.
 * GET /api/ao/scheduled-posts?email=xxx&status=xxx&limit=50
 * Requires email (owner). Optional: status (scheduled|publishing|posted|failed), limit, from, to.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

const OWNER_EMAIL = (process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = (req.query?.email || req.headers?.['x-ao-email'] || '').toLowerCase().trim();
  if (!email) {
    return res.status(401).json({ error: 'Email required' });
  }
  if (OWNER_EMAIL && email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const status = req.query?.status || null;
  const limit = Math.min(Number(req.query?.limit) || 50, 100);
  const from = req.query?.from || null;
  const to = req.query?.to || null;

  let query = supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, platform, account_id, scheduled_at, text, image_url, status, external_id, error_message, created_at, updated_at')
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
