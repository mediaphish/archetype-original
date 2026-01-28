/**
 * Generate Scenario Insights
 * 
 * POST /api/operators/events/[id]/generate-scenarios
 * 
 * Generates 4-5 AI-powered scenario insights for an event based on attendee profiles and current challenges.
 * Only SA, CO, or Accountant can generate scenarios. Requires RSVP to be closed.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA, CO, or Accountant can generate scenarios
    const canGenerate = await canManageTopics(email);
    if (!canGenerate) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins, Chief Operators, or Accountants can generate scenarios' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, title, state, rsvp_closed')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: `Event must be LIVE to generate scenarios. Current state: ${event.state}` });
    }

    // Check if RSVP is closed
    if (!event.rsvp_closed) {
      return res.status(400).json({ ok: false, error: 'RSVP must be closed before generating scenarios' });
    }

    // Check if scenarios already exist
    const { data: existingScenarios } = await supabaseAdmin
      .from('operators_event_scenarios')
      .select('id')
      .eq('event_id', id)
      .limit(1);

    if (existingScenarios && existingScenarios.length > 0) {
      return res.status(400).json({ ok: false, error: 'Scenarios have already been generated for this event' });
    }

    // Get confirmed attendees with their current_challenge from RSVPs
    const { data: rsvps } = await supabaseAdmin
      .from('operators_rsvps')
      .select('user_email, current_challenge')
      .eq('event_id', id)
      .eq('status', 'confirmed');

    if (!rsvps || rsvps.length === 0) {
      return res.status(400).json({ ok: false, error: 'No confirmed attendees found. Cannot generate scenarios without attendees.' });
    }

    // Get attendee profiles (bio, role_title, industry)
    const attendeeEmails = rsvps.map(r => r.user_email);
    const { data: attendees } = await supabaseAdmin
      .from('operators_users')
      .select('email, role_title, industry, bio')
      .in('email', attendeeEmails);

    // Build attendee data with both bio and current_challenge
    const attendeeData = rsvps.map(rsvp => {
      const attendee = attendees?.find(a => a.email === rsvp.user_email) || {};
      return {
        email: rsvp.user_email,
        role: attendee.role_title || 'Not specified',
        industry: attendee.industry || 'Not specified',
        bio: attendee.bio || '',
        current_challenge: rsvp.current_challenge || ''
      };
    });

    // Get previous scenarios for duplicate detection
    const previousScenarios = await getPreviousScenariosForAttendees(attendeeEmails, id);

    // Get active topics from AO Topic Library
    const { data: topicLibrary } = await supabaseAdmin
      .from('operators_topics')
      .select('title, description, category, tags')
      .eq('is_active', true)
      .order('category', { ascending: true });

    // Build room profile
    const roomProfile = {
      eventTitle: event.title,
      attendeeCount: attendeeData.length,
      attendees: attendeeData
    };

    // Check if OpenAI API key is configured (this project uses OPEN_API_KEY)
    const openaiApiKey = process.env.OPEN_API_KEY;
    if (!openaiApiKey) {
      console.error('[GENERATE_SCENARIOS] OpenAI API key missing (OPEN_API_KEY)');
      return res.status(500).json({ ok: false, error: 'OpenAI API key not configured' });
    }

    // Build prompt for OpenAI
    const prompt = buildScenarioGenerationPrompt(roomProfile, topicLibrary || [], previousScenarios);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing leadership event rooms and generating realistic, neutralized problem scenarios (1-paragraph stories) that benefit multiple attendees. You create insightful, actionable scenarios based on attendee profiles and current challenges.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('[GENERATE_SCENARIOS] OpenAI API error:', errorData);
      return res.status(500).json({ ok: false, error: 'Failed to generate scenarios from AI service' });
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return res.status(500).json({ ok: false, error: 'Invalid response from AI service' });
    }

    // Parse AI response (expecting JSON array of scenarios)
    let scenarios;
    try {
      // Try to extract JSON from response (might have markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      scenarios = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[GENERATE_SCENARIOS] Failed to parse AI response:', parseError);
      return res.status(500).json({ ok: false, error: 'Failed to parse AI response. Please try again.' });
    }

    // Validate scenarios structure
    if (!Array.isArray(scenarios) || scenarios.length < 4 || scenarios.length > 5) {
      return res.status(500).json({ ok: false, error: `AI generated ${scenarios.length} scenarios. Expected 4-5 scenarios.` });
    }

    // Get previous scenario IDs for tracking
    const previousScenarioIds = previousScenarios.map(s => s.id);

    // Store scenarios in database
    const scenariosToInsert = scenarios.map((scenario, index) => ({
      event_id: id,
      rank: index + 1,
      scenario_title: scenario.scenario_title || scenario.title || `Scenario ${index + 1}`,
      scenario_story: scenario.scenario_story || scenario.story || '',
      why_this_fits_this_room: scenario.why_this_fits_this_room || scenario.why_this_fits || '',
      starter_prompts: Array.isArray(scenario.starter_prompts) ? scenario.starter_prompts : (scenario.prompts || []),
      previous_scenarios: previousScenarioIds
    }));

    const { data: insertedScenarios, error: insertError } = await supabaseAdmin
      .from('operators_event_scenarios')
      .insert(scenariosToInsert)
      .select();

    if (insertError) {
      console.error('[GENERATE_SCENARIOS] Database error inserting scenarios:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to save scenarios to database' });
    }

    return res.status(200).json({ ok: true, scenarios: insertedScenarios });
  } catch (error) {
    console.error('[GENERATE_SCENARIOS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/**
 * Get previous scenarios from events with overlapping attendees
 */
async function getPreviousScenariosForAttendees(attendeeEmails, currentEventId) {
  try {
    // Find previous events where at least one of these attendees was confirmed
    const { data: previousRSVPs } = await supabaseAdmin
      .from('operators_rsvps')
      .select('event_id')
      .in('user_email', attendeeEmails)
      .eq('status', 'confirmed')
      .neq('event_id', currentEventId);

    if (!previousRSVPs || previousRSVPs.length === 0) {
      return [];
    }

    // Get unique event IDs
    const previousEventIds = [...new Set(previousRSVPs.map(r => r.event_id))];

    // Get scenarios from those events
    const { data: previousScenarios } = await supabaseAdmin
      .from('operators_event_scenarios')
      .select('id, scenario_title, scenario_story, why_this_fits_this_room')
      .in('event_id', previousEventIds)
      .order('created_at', { ascending: false })
      .limit(20); // Limit to most recent 20 scenarios

    return previousScenarios || [];
  } catch (error) {
    console.error('[GENERATE_SCENARIOS] Error fetching previous scenarios:', error);
    return [];
  }
}

/**
 * Build prompt for OpenAI scenario generation
 */
function buildScenarioGenerationPrompt(roomProfile, topicLibrary, previousScenarios) {
  let prompt = `You are analyzing a leadership event room for "${roomProfile.eventTitle}".

Attendee Profiles (${roomProfile.attendeeCount} confirmed attendees):
`;

  roomProfile.attendees.forEach((attendee, index) => {
    prompt += `\n${index + 1}. Role: ${attendee.role}, Industry: ${attendee.industry}`;
    if (attendee.bio) {
      prompt += `\n   Bio: ${attendee.bio.substring(0, 300)}${attendee.bio.length > 300 ? '...' : ''}`;
    }
    if (attendee.current_challenge) {
      prompt += `\n   Current Challenge: ${attendee.current_challenge.substring(0, 200)}${attendee.current_challenge.length > 200 ? '...' : ''}`;
    }
  });

  if (topicLibrary.length > 0) {
    prompt += `\n\nAO Topic Library (${topicLibrary.length} active topics):\n`;
    topicLibrary.forEach((topic, index) => {
      prompt += `\n${index + 1}. ${topic.title} (${topic.category})\n   ${topic.description}`;
      if (topic.tags && topic.tags.length > 0) {
        prompt += `\n   Tags: ${topic.tags.join(', ')}`;
      }
    });
  }

  if (previousScenarios.length > 0) {
    prompt += `\n\nPrevious Scenarios (from events with overlapping attendees - AVOID DUPLICATES):\n`;
    previousScenarios.forEach((scenario, index) => {
      prompt += `\n${index + 1}. ${scenario.scenario_title}\n   ${scenario.scenario_story.substring(0, 150)}${scenario.scenario_story.length > 150 ? '...' : ''}`;
    });
    prompt += `\n\nIMPORTANT: Do NOT generate scenarios that are similar to the previous scenarios listed above. Create new, unique scenarios.`;
  }

  prompt += `\n\nRequirements:
- Generate exactly 4-5 realistic problem scenarios (no more, no less)
- Each scenario is a 1-paragraph story (3-5 sentences) describing a realistic leadership problem
- Scenarios must be based on insights from attendee bios + current_challenge fields
- Rank scenarios by group relevance (scenarios that benefit multiple attendees are ranked higher)
- Do NOT attribute any scenario to any individual attendee
- Neutralize company names: Use generic descriptors like "a mid-size tech company", "a regional manufacturing firm", etc.
- Do NOT reference real company names or specific companies
- Make scenarios realistic but generic enough to apply to multiple attendees
- Avoid duplicates from previous scenarios (if provided above)
- Each scenario must include:
  - scenario_title: Clear, concise title
  - scenario_story: 1 paragraph (3-5 sentences) describing the problem scenario as a story
  - why_this_fits_this_room: 1 sentence explaining why this scenario is relevant to this specific group
  - starter_prompts: Array of 3-5 open-ended questions to start discussion

Return your response as a JSON array of scenarios, ordered by rank (most relevant first). Example format:
[
  {
    "scenario_title": "Scaling Team Culture During Rapid Growth",
    "scenario_story": "A mid-size tech company has grown from 50 to 200 employees in 18 months. The leadership team is struggling to maintain the close-knit culture and direct communication that made the company successful. New hires feel disconnected, while long-time employees complain that 'things aren't the same.' The CEO is concerned that the company's core values are being diluted, but doesn't know how to scale culture without losing what made the company special.",
    "why_this_fits_this_room": "Multiple attendees lead growing teams and face challenges in maintaining culture and communication during expansion.",
    "starter_prompts": [
      "What strategies have you used to preserve company culture during rapid growth?",
      "How do you ensure new hires understand and embody core values?",
      "What communication structures work best for scaling teams?",
      "How do you balance maintaining traditions with necessary evolution?"
    ]
  }
]`;

  return prompt;
}
