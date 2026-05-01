import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';
import { parseEmbedding, cosineSimilarity } from '../lib/narrativeClustering.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    const { data: jobs, error: jobErr } = await supabaseAdmin
      .from('blp_cluster_jobs')
      .select('id, story_id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(25);
    if (jobErr) throw jobErr;
    if (!jobs || jobs.length === 0) return res.status(200).json({ ok: true, processed: 0 });

    let processed = 0;
    for (const job of jobs) {
      try {
        const { data: story, error: storyErr } = await supabaseAdmin
          .from('blp_stories')
          .select('id, tone, embedding_vector')
          .eq('id', job.story_id)
          .maybeSingle();
        if (storyErr || !story) throw storyErr || new Error('Story not found');

        const currentEmbedding = parseEmbedding(story.embedding_vector);
        if (!currentEmbedding) throw new Error('Missing embedding');

        const { data: candidates, error: candErr } = await supabaseAdmin
          .from('blp_stories')
          .select('id, cluster_id, embedding_vector')
          .eq('tone', story.tone)
          .eq('status', 'approved')
          .not('cluster_id', 'is', null)
          .neq('id', story.id)
          .limit(500);
        if (candErr) throw candErr;

        let bestScore = 0;
        let bestClusterId = null;
        for (const candidate of candidates || []) {
          const candidateEmbedding = parseEmbedding(candidate.embedding_vector);
          if (!candidateEmbedding || !candidate.cluster_id) continue;
          const score = cosineSimilarity(currentEmbedding, candidateEmbedding);
          if (score > bestScore) {
            bestScore = score;
            bestClusterId = candidate.cluster_id;
          }
        }

        let clusterId = bestClusterId;
        if (!clusterId || bestScore < 0.82) {
          const { data: newCluster, error: clusterErr } = await supabaseAdmin
            .from('blp_clusters')
            .insert({ tone: story.tone })
            .select('id')
            .single();
          if (clusterErr) throw clusterErr;
          clusterId = newCluster.id;
        }

        await supabaseAdmin.from('blp_stories').update({ cluster_id: clusterId }).eq('id', story.id);
        await supabaseAdmin
          .from('blp_cluster_jobs')
          .update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null })
          .eq('id', job.id);
        processed += 1;
      } catch (err) {
        await supabaseAdmin
          .from('blp_cluster_jobs')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: String(err?.message || err).slice(0, 500),
          })
          .eq('id', job.id);
      }
    }

    return res.status(200).json({ ok: true, processed });
  } catch (error) {
    console.error('[BLP CLUSTER PROCESS] Error:', error);
    return res.status(500).json({ error: 'Failed to process cluster queue.' });
  }
}
