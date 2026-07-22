/**
 * ALI Super Admin Intelligence Action Logger
 * 
 * POST /api/ali/super-admin/intelligence/:id/action
 * 
 * Logs an action taken on an intelligence item (e.g. 'prompt_copied').
 * Fire-and-forget endpoint - frontend does not read the response body.
 */

import { supabaseAdmin } from '../../../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { action } = req.body || {};

  if (!id) {
    return res.status(400).json({ ok: false, error: 'Missing id parameter' });
  }

  if (!action) {
    return res.status(400).json({ ok: false, error: 'Missing action in request body' });
  }

  try {
    // Fetch current item to get existing actions array
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('ali_intelligence_items')
      .select('actions')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      console.error('[intelligence/action.js] Item not found:', id);
      return res.status(404).json({ ok: false, error: 'Intelligence item not found' });
    }

    // Append new action to the actions array
    const currentActions = item.actions || [];
    const newAction = {
      action,
      timestamp: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('ali_intelligence_items')
      .update({
        actions: [...currentActions, newAction]
      })
      .eq('id', id);

    if (updateError) {
      console.error('[intelligence/action.js] Update error:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to log action' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[intelligence/action.js] Unexpected error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
