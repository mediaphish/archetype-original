/**
 * Get and Update Event Scenarios
 * 
 * GET /api/operators/events/[id]/scenarios?email=xxx
 * PUT /api/operators/events/[id]/scenarios
 * 
 * Get scenarios for an event (SA/CO/Accountant only)
 * Update scenarios for an event (SA/CO only, before event opens)
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const email = req.method === 'GET' ? req.query.email : req.body.email;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA, CO, or Accountant can access scenarios
    const canAccess = await canManageTopics(email);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins, Chief Operators, or Accountants can access scenarios' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, state')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    if (req.method === 'GET') {
      // Get scenarios
      const { data: scenarios, error: scenariosError } = await supabaseAdmin
        .from('operators_event_scenarios')
        .select('*')
        .eq('event_id', id)
        .order('rank', { ascending: true });

      if (scenariosError) {
        console.error('[GET_SCENARIOS] Database error:', scenariosError);
        return res.status(500).json({ ok: false, error: 'Failed to fetch scenarios' });
      }

      return res.status(200).json({ ok: true, scenarios: scenarios || [] });
    }

    if (req.method === 'PUT') {
      // Update scenarios
      const { scenarios } = req.body;

      if (!Array.isArray(scenarios)) {
        return res.status(400).json({ ok: false, error: 'Scenarios must be an array' });
      }

      // Check state - must be LIVE
      if (event.state !== 'LIVE') {
        return res.status(400).json({ ok: false, error: `Event must be LIVE to edit scenarios. Current state: ${event.state}` });
      }

      // Check if scenarios are locked
      const { data: existingScenarios } = await supabaseAdmin
        .from('operators_event_scenarios')
        .select('is_locked')
        .eq('event_id', id)
        .limit(1);

      if (existingScenarios && existingScenarios.length > 0 && existingScenarios[0].is_locked) {
        return res.status(400).json({ ok: false, error: 'Scenarios are locked and cannot be edited' });
      }

      // Validate scenarios structure
      if (scenarios.length < 4 || scenarios.length > 5) {
        return res.status(400).json({ ok: false, error: 'Must have exactly 4-5 scenarios' });
      }

      // Validate each scenario
      for (const scenario of scenarios) {
        if (!scenario.id || !scenario.scenario_title || !scenario.scenario_story || !scenario.why_this_fits_this_room) {
          return res.status(400).json({ ok: false, error: 'Each scenario must have id, scenario_title, scenario_story, and why_this_fits_this_room' });
        }
        if (!Array.isArray(scenario.starter_prompts) || scenario.starter_prompts.length < 3) {
          return res.status(400).json({ ok: false, error: 'Each scenario must have at least 3 starter_prompts' });
        }
      }

      // Update scenarios (delete all and reinsert with new ranks)
      // First, delete existing scenarios
      const { error: deleteError } = await supabaseAdmin
        .from('operators_event_scenarios')
        .delete()
        .eq('event_id', id);

      if (deleteError) {
        console.error('[UPDATE_SCENARIOS] Database error deleting scenarios:', deleteError);
        return res.status(500).json({ ok: false, error: 'Failed to update scenarios' });
      }

      // Insert updated scenarios with new ranks
      const scenariosToInsert = scenarios.map((scenario, index) => ({
        event_id: id,
        rank: index + 1,
        scenario_title: scenario.scenario_title,
        scenario_story: scenario.scenario_story,
        why_this_fits_this_room: scenario.why_this_fits_this_room,
        starter_prompts: scenario.starter_prompts,
        generated_by: 'AI',
        is_locked: false,
        previous_scenarios: scenario.previous_scenarios || []
      }));

      const { data: insertedScenarios, error: insertError } = await supabaseAdmin
        .from('operators_event_scenarios')
        .insert(scenariosToInsert)
        .select();

      if (insertError) {
        console.error('[UPDATE_SCENARIOS] Database error inserting scenarios:', insertError);
        return res.status(500).json({ ok: false, error: 'Failed to save scenarios' });
      }

      return res.status(200).json({ ok: true, scenarios: insertedScenarios });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[SCENARIOS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
