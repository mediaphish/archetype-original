import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';

/**
 * GET: list approved (live) stories for admin removal.
 * DELETE: permanently remove a published story by deleting its submission (cascades to blp_stories, votes, cluster_jobs).
 */
export default async function handler(req, res) {
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('blp_stories')
        .select('id, submission_id, region, industry, neutralized_text, published_at, created_at')
        .eq('status', 'approved')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BLP admin published GET]', error);
        return res.status(500).json({ error: 'Failed to load published stories.' });
      }

      const stories = (data || []).map((row) => ({
        id: row.id,
        submission_id: row.submission_id,
        region: row.region,
        industry: row.industry,
        preview: String(row.neutralized_text || '').slice(0, 220),
        published_at: row.published_at,
        created_at: row.created_at,
      }));

      return res.status(200).json({ ok: true, stories });
    }

    if (req.method === 'DELETE') {
      const storyId = String(req.body?.storyId || req.query?.storyId || '').trim();
      if (!storyId) return res.status(400).json({ error: 'storyId is required.' });

      const { data: story, error: readErr } = await supabaseAdmin
        .from('blp_stories')
        .select('id, submission_id, status')
        .eq('id', storyId)
        .maybeSingle();

      if (readErr || !story) {
        return res.status(404).json({ error: 'Story not found.' });
      }
      if (story.status !== 'approved') {
        return res.status(400).json({ error: 'Only approved live stories can be removed this way.' });
      }

      const { error: delErr } = await supabaseAdmin.from('blp_submissions').delete().eq('id', story.submission_id);

      if (delErr) {
        console.error('[BLP admin published DELETE]', delErr);
        return res.status(500).json({ error: 'Failed to remove story.' });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[BLP admin published]', e);
    return res.status(500).json({ error: 'Server error.' });
  }
}
