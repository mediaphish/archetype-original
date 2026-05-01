/**
 * ALI Narrative Admin: Moderate
 *
 * Approve, reject, flag, or redact a single narrative.
 *
 * POST /api/ali/narrative/admin/moderate
 * Body: {
 *   email: string (super admin),
 *   narrativeId: string (uuid),
 *   action: 'approve' | 'reject' | 'flag' | 'edit_for_redaction',
 *   notes?: string,
 *   redactedText?: string (required when action='edit_for_redaction')
 * }
 *
 * Auth: super admin
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireSuperAdmin } from '../../../../lib/ali-admin-auth.js';

const ACTION_MAP = {
  approve: { moderation_status: 'approved', audit: 'approved' },
  reject: { moderation_status: 'rejected', audit: 'rejected' },
  flag: { moderation_status: 'flagged', audit: 'flagged' },
  edit_for_redaction: { moderation_status: null, audit: 'edited_for_redaction' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const session = await requireSuperAdmin(req, res, { body });
  if (!session) return;

  const { narrativeId, action, notes, redactedText } = body;
  if (!narrativeId) {
    return res.status(400).json({ ok: false, error: 'narrativeId is required' });
  }
  if (!action || !ACTION_MAP[action]) {
    return res.status(400).json({
      ok: false,
      error: `action must be one of: ${Object.keys(ACTION_MAP).join(', ')}`,
    });
  }
  if (action === 'edit_for_redaction' && (!redactedText || redactedText.trim().length < 8)) {
    return res.status(400).json({ ok: false, error: 'redactedText is required and must be non-trivial' });
  }

  const { data: narrative, error: getErr } = await supabaseAdmin
    .from('ali_narratives')
    .select('id, moderation_status, is_visible, text')
    .eq('id', narrativeId)
    .maybeSingle();

  if (getErr || !narrative) {
    return res.status(404).json({ ok: false, error: 'Narrative not found' });
  }

  const update = {};
  const config = ACTION_MAP[action];
  if (config.moderation_status) {
    update.moderation_status = config.moderation_status;
    update.moderated_at = new Date().toISOString();
  }
  if (action === 'edit_for_redaction') {
    update.text = redactedText.trim();
  }
  if (action === 'reject') {
    update.is_visible = false;
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('ali_narratives')
    .update(update)
    .eq('id', narrativeId)
    .select('id, moderation_status, is_visible, text')
    .maybeSingle();

  if (updErr) {
    console.error('[ali/narrative/admin/moderate] update error:', updErr);
    return res.status(500).json({ ok: false, error: 'Failed to apply moderation' });
  }

  await supabaseAdmin.from('ali_narrative_audit').insert({
    narrative_id: narrativeId,
    action: config.audit,
    actor: session.email,
    notes: notes || null,
  });

  return res.status(200).json({ ok: true, narrative: updated });
}
