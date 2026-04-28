import { supabaseAdmin } from '../lib/supabase-admin.js';
import { getVoteKey } from '../lib/badLeaderAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const storyId = String(req.body?.neutralizedStoryId || '').trim();
    if (!storyId) return res.status(400).json({ error: 'neutralizedStoryId is required.' });

    const voteKey = getVoteKey(req);
    const { error: voteErr } = await supabaseAdmin.from('blp_votes').insert({
      story_id: storyId,
      vote_key: voteKey,
    });

    if (voteErr && !String(voteErr.message || '').toLowerCase().includes('duplicate')) {
      throw voteErr;
    }

    if (!voteErr) {
      const { data: story, error: readErr } = await supabaseAdmin
        .from('blp_stories')
        .select('thumbs_up_count')
        .eq('id', storyId)
        .single();
      if (readErr) throw readErr;
      const nextCount = (story?.thumbs_up_count || 0) + 1;
      await supabaseAdmin.from('blp_stories').update({ thumbs_up_count: nextCount }).eq('id', storyId);
    }

    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('blp_stories')
      .select('thumbs_up_count')
      .eq('id', storyId)
      .single();
    if (latestErr) throw latestErr;

    return res.status(200).json({ ok: true, count: latest?.thumbs_up_count || 0 });
  } catch (error) {
    console.error('[BLP THUMBS UP] Error:', error);
    return res.status(500).json({ error: 'Failed to update thumbs up.' });
  }
}
