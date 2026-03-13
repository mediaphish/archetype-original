/**
 * AO Automation — Publishing: schedule posts from a Ready Post idea.
 * POST /api/ao/publishing/schedule-from-idea
 * Body: { idea_id, schedule: { linkedin?: iso, facebook?: iso, instagram?: iso, x?: iso }, edits?: { channel: text } }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toPlatform(channel) {
  if (channel === 'x') return 'twitter';
  return channel;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ideaId = req.body?.idea_id;
  if (!ideaId) return res.status(400).json({ ok: false, error: 'idea_id required' });

  const schedule = req.body?.schedule && typeof req.body.schedule === 'object' ? req.body.schedule : {};
  const edits = req.body?.edits && typeof req.body.edits === 'object' ? req.body.edits : {};

  try {
    const { data: idea, error: fetchErr } = await supabaseAdmin
      .from('ao_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('created_by_email', auth.email)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }
    if (idea.path !== 'ready_post') return res.status(400).json({ ok: false, error: 'Not a Ready Post' });

    const drafts = idea.ready_social_drafts && typeof idea.ready_social_drafts === 'object' ? idea.ready_social_drafts : null;
    const draftsByChannel = drafts?.drafts_by_channel && typeof drafts.drafts_by_channel === 'object' ? drafts.drafts_by_channel : {};
    const firstByChannel = drafts?.first_comment_suggestions && typeof drafts.first_comment_suggestions === 'object' ? drafts.first_comment_suggestions : {};

    const rows = [];
    const channels = ['linkedin', 'facebook', 'instagram', 'x'];
    for (const c of channels) {
      const when = parseIso(schedule[c]);
      if (!when) continue;
      const text = String(edits[c] || draftsByChannel[c] || '').trim();
      if (!text) continue;
      const platform = toPlatform(c);
      const first_comment = String(firstByChannel[c] || '').trim() || null;
      rows.push({
        platform,
        account_id: platform === 'facebook' || platform === 'instagram' ? 'meta' : 'personal',
        scheduled_at: when,
        text,
        image_url: null,
        first_comment,
        status: 'scheduled',
        source_kind: 'idea',
        source_idea_id: ideaId,
        intent: {
          title: idea.title || null,
          source_url: idea.source_url || null,
          ao_lane: idea.suggested_ao_lane || null,
          topic_tags: Array.isArray(idea.suggested_topic_tags) ? idea.suggested_topic_tags : null,
          why_it_matters: idea.why_it_matters || null,
        },
        ao_lane: idea.suggested_ao_lane || null,
        topic_tags: Array.isArray(idea.suggested_topic_tags) ? idea.suggested_topic_tags : null,
        why_it_matters: idea.why_it_matters || null,
      });
    }

    if (rows.length === 0) return res.status(400).json({ ok: false, error: 'No scheduled channels provided' });

    let inserted = null;
    try {
      const out = await supabaseAdmin
        .from('ao_scheduled_posts')
        .insert(rows)
        .select('id, platform, scheduled_at, status');
      if (out.error) throw out.error;
      inserted = out.data || [];
    } catch (e2) {
      const msg = String(e2?.message || '');
      const missingIntentCols = msg.includes('source_kind') || msg.includes('source_idea_id') || msg.includes('intent');
      if (!missingIntentCols) return res.status(500).json({ ok: false, error: msg || 'Insert failed' });

      const minimalRows = rows.map(({ source_kind, source_idea_id, intent, ...rest }) => rest);
      const out = await supabaseAdmin
        .from('ao_scheduled_posts')
        .insert(minimalRows)
        .select('id, platform, scheduled_at, status');
      if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
      inserted = out.data || [];
    }

    return res.status(200).json({ ok: true, scheduled: inserted || [] });
  } catch (e) {
    console.error('[ao/publishing/schedule-from-idea]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

