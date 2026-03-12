/**
 * AO Automation — Generate draft for writing queue item (OpenAI).
 * POST /api/ao/writing/[id]/draft?email=xxx
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { getOpenAiKey } from '../../../../lib/openaiKey.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Writing ID required' });
  }

  try {
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('ao_writing_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      if (fetchError?.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Writing item not found' });
      }
      return res.status(500).json({ ok: false, error: fetchError?.message || 'Not found' });
    }

    await supabaseAdmin
      .from('ao_writing_queue')
      .update({ status: 'drafting', updated_at: new Date().toISOString() })
      .eq('id', id);

    const apiKey = getOpenAiKey();
    let draftContent = '';
    if (apiKey) {
      const prompt = `Write a short article draft (2-4 paragraphs) for this topic.\nTitle: ${row.title || 'Untitled'}\nAngle: ${row.angle || 'General'}\nVoice: ${row.voice || 'Professional'}\nLength: ${row.length || 'Medium'}\nSource notes: ${row.source_notes || 'None'}`;
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
        }),
      });
      if (openaiRes.ok) {
        const json = await openaiRes.json();
        draftContent = json.choices?.[0]?.message?.content?.trim() || '';
      }
    }
    if (!draftContent) {
      draftContent = `[Draft placeholder for: ${row.title || 'Untitled'}]\n\nAngle: ${row.angle || '—'}\nVoice: ${row.voice || '—'}\n\nAdd OPEN_API_KEY to generate a real draft.`;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ao_writing_queue')
      .update({
        status: 'drafted',
        draft_content: draftContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ ok: false, error: updateError.message });
    }
    return res.status(200).json({ ok: true, writing: updated });
  } catch (e) {
    console.error('[ao/writing/draft]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
