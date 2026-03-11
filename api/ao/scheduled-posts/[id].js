/**
 * PATCH /api/ao/scheduled-posts/[id]?email=xxx
 * Body: { first_comment: string | null } — update or remove first comment.
 * Allowed only when post status is 'scheduled'. Same auth as list (owner email).
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Post ID required' });
  }

  const first_comment = req.body?.first_comment;
  if (first_comment !== undefined && first_comment !== null && typeof first_comment !== 'string') {
    return res.status(400).json({ ok: false, error: 'first_comment must be a string or null' });
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return res.status(404).json({ ok: false, error: 'Post not found' });
  }
  if (row.status !== 'scheduled') {
    return res.status(400).json({ ok: false, error: 'Can only update first_comment for scheduled posts' });
  }

  const value = first_comment === null || first_comment === '' ? null : String(first_comment).trim() || null;
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .update({
      first_comment: value,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, platform, account_id, scheduled_at, text, image_url, status, first_comment, first_comment_status, first_comment_error_message, created_at, updated_at')
    .single();

  if (updateError) {
    return res.status(500).json({ ok: false, error: updateError.message });
  }
  return res.status(200).json({ ok: true, post: updated });
}
