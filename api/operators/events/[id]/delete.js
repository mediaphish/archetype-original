/**
 * Permanently delete an event (before it is closed).
 * Chief Operator or Super Admin only. Not allowed for CLOSED events.
 *
 * DELETE /api/operators/events/[id]/delete?email=...
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { getUserOperatorsRoles } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  const email =
    (req.method === 'DELETE' && req.query.email) ||
    (req.method === 'POST' && req.body && req.body.email) ||
    req.query.email;

  if (!id) {
    return res.status(400).json({ ok: false, error: 'Event ID required' });
  }
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ ok: false, error: 'Email required' });
  }

  try {
    const roles = await getUserOperatorsRoles(email);
    const isSA = roles.includes('super_admin');
    const isCO = roles.includes('chief_operator');
    if (!isSA && !isCO) {
      return res.status(403).json({ ok: false, error: 'Only Chief Operators can delete events' });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, state, title')
      .eq('id', id)
      .maybeSingle();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    if (event.state === 'CLOSED') {
      return res.status(400).json({
        ok: false,
        error: 'Cannot delete a closed event. Reopen it first if removal is required.',
      });
    }

    const { error: delError } = await supabaseAdmin.from('operators_events').delete().eq('id', id);

    if (delError) {
      console.error('[OPERATORS DELETE EVENT]', delError);
      return res.status(500).json({ ok: false, error: 'Failed to delete event' });
    }

    return res.status(200).json({ ok: true, deleted_id: id, title: event.title });
  } catch (err) {
    console.error('[OPERATORS DELETE EVENT]', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete event' });
  }
}
