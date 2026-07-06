/**
 * POST /api/ao/auto/session-brief
 *
 * Manually triggers session brief generation for the active thread.
 * Bart can say "save a session brief" and the panel calls this route.
 * The brief is generated using claude-haiku and saved to ao_content_drafts.
 * It loads automatically into the next session.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getAutoThreadState } from '../../../lib/ao/autoHub.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { thread_id } = req.body || {};
  if (!thread_id) {
    return res.status(400).json({ ok: false, error: 'thread_id is required' });
  }

  try {
    const state = await getAutoThreadState(auth.email, thread_id);
    const messages = state?.messages || [];

    if (messages.length < 4) {
      return res.status(400).json({ ok: false, error: 'Thread is too short to generate a meaningful brief.' });
    }

    const recentMessages = messages.slice(-30);
    const historyText = recentMessages
      .map(m => `${m.role === 'user' ? 'Bart' : 'Auto'}: ${String(m.content || '').slice(0, 500)}`)
      .join('\n\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are summarizing a working session between Bart Paden and his AI CMO (Auto) at Archetype Original.

Read this conversation and write a session brief in Bart's voice that captures:

1. WORKING ON: What content was being worked on (be specific — series name, part number, topic, post type)
2. DECISIONS MADE: What was approved, what was rejected, what angles were chosen
3. PUBLISHED OR SCHEDULED: Anything that went live or got scheduled, with slugs/dates if mentioned
4. WHAT IS NEXT: The exact next step — specific enough that a new session can pick up without asking
5. OPEN FLAGS: Any unresolved issues, pending approvals, or things Bart flagged as concerns

Write in plain, direct language. No filler. No AI phrasing. Short sentences. This brief will be the first thing Auto reads in the next session.

CONVERSATION:
${historyText}

Write the brief now. Format it with the 5 section headers above. Keep it under 400 words total.`
      }]
    });

    const briefText = response.content?.[0]?.text || '';
    if (!briefText || briefText.length < 50) {
      return res.status(500).json({ ok: false, error: 'Brief generation returned empty content.' });
    }

    await supabaseAdmin
      .from('ao_content_drafts')
      .upsert({
        created_by_email: auth.email.toLowerCase().trim(),
        kind: 'session_brief',
        series_slug: thread_id,
        part_number: 1,
        title: `Session Brief — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        slug: `session-brief-${thread_id.slice(0, 8)}`,
        content: briefText,
        summary: briefText.slice(0, 200),
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { thread_id, message_count: messages.length }
      }, {
        onConflict: 'created_by_email,series_slug,part_number,kind',
        ignoreDuplicates: false,
      });

    return res.status(200).json({
      ok: true,
      brief: briefText,
      message: 'Session brief saved. It will load automatically in your next session.'
    });
  } catch (err) {
    console.error('[session-brief]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
