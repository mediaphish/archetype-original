/**
 * AO Automation — Approve journal topic and create writing queue entry.
 * POST /api/ao/journal-topics/[id]/approve-and-draft?email=xxx
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Topic ID required' });
  }

  try {
    const { data: topic, error: topicError } = await supabaseAdmin
      .from('ao_journal_topic_queue')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (topicError || !topic) {
      if (topicError?.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Topic not found' });
      }
      return res.status(500).json({ ok: false, error: topicError?.message || 'Topic not found' });
    }

    const { data: writingRow, error: insertError } = await supabaseAdmin
      .from('ao_writing_queue')
      .insert({
        journal_topic_id: topic.id,
        title: topic.topic_title,
        angle: topic.suggested_angle || null,
        voice: topic.suggested_voice || null,
        length: topic.suggested_length || null,
        source_notes: topic.why_it_matters || null,
        corpus_refs: topic.related_ao_passages || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ ok: false, error: insertError.message });
    }
    return res.status(200).json({ ok: true, topic, writing: writingRow });
  } catch (e) {
    console.error('[ao/journal-topics/approve-and-draft]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
