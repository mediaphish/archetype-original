/**
 * AO Automation — Ready Posts: generate per-channel social drafts.
 * POST /api/ao/ideas/:id/generate-social-drafts
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { generateReadyPostDrafts } from '../../../../lib/ao/readyPostSocialDrafts.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const { data: idea, error: fetchErr } = await supabaseAdmin
      .from('ao_ideas')
      .select('*')
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    if (idea.path !== 'ready_post') {
      return res.status(400).json({ ok: false, error: 'This idea is not a Ready Post' });
    }

    const channels = Array.isArray(idea.ready_social_channels) ? idea.ready_social_channels : ['linkedin', 'facebook', 'instagram', 'x'];
    const markdown = idea.markdown_content || idea.raw_input || '';

    const drafts = await generateReadyPostDrafts({ markdown, title: idea.title || '', channels });
    if (!drafts.ok) return res.status(500).json({ ok: false, error: drafts.error || 'Draft generation failed' });

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('ao_ideas')
      .update({
        ready_social_drafts: drafts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by_email', auth.email)
      .select('*')
      .single();

    if (updErr) return res.status(500).json({ ok: false, error: updErr.message });
    return res.status(200).json({ ok: true, idea: updated });
  } catch (e) {
    console.error('[ao/ideas generate-social-drafts]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

