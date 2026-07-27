/**
 * Weekly ALI Narrative Clustering
 *
 * Groups newly-approved, embedded narratives into clusters using the shared
 * cosine-similarity policy in lib/narrativeClustering.js — the same math BLP
 * already uses for its own (separate) stories table. Only narratives that are
 * approved and have an embedding are eligible; narratives without an embedding
 * (e.g. submitted before this was wired up, or if generation failed) are
 * skipped, not force-clustered.
 *
 * Systemic narratives have condition = null and only cluster against other
 * systemic narratives (also condition = null) for the same tenant. Dissonance
 * narratives cluster against other dissonance narratives with the same
 * condition string, for the same tenant. The two never mix.
 *
 * Configured in vercel.json (crons -> ali-process-narrative-clusters).
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { parseEmbedding, findBestCluster } from '../../lib/narrativeClustering.js';
import crypto from 'crypto';

const SIMILARITY_THRESHOLD = 0.82;

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  try {
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('ali_narratives')
      .select('id, tenant_id, condition, embedding_vector')
      .eq('moderation_status', 'approved')
      .is('cluster_id', null)
      .not('embedding_vector', 'is', null)
      .limit(200);

    if (pendingError) {
      console.error('[ali-cluster-cron] Failed to fetch pending narratives:', pendingError.message);
      return res.status(500).json({ ok: false, error: 'Failed to fetch pending narratives' });
    }

    if (!pending || pending.length === 0) {
      return res.status(200).json({ ok: true, clustered: 0, message: 'Nothing to cluster' });
    }

    let clustered = 0;
    const errors = [];

    for (const item of pending) {
      try {
        const candidateEmbedding = parseEmbedding(item.embedding_vector);
        if (!candidateEmbedding) continue;

        let candidateQuery = supabaseAdmin
          .from('ali_narratives')
          .select('id, cluster_id, embedding_vector')
          .eq('tenant_id', item.tenant_id)
          .not('cluster_id', 'is', null)
          .neq('id', item.id)
          .limit(300);

        // .eq() does not match NULL rows in PostgREST — systemic narratives
        // (condition = null) require .is(), dissonance narratives (a real
        // condition string) require .eq(). Never mix the two groups.
        candidateQuery = item.condition === null
          ? candidateQuery.is('condition', null)
          : candidateQuery.eq('condition', item.condition);

        const { data: candidates, error: candError } = await candidateQuery;

        if (candError) throw candError;

        const parsedCandidates = (candidates || [])
          .map((c) => ({ embedding: parseEmbedding(c.embedding_vector), cluster_id: c.cluster_id }))
          .filter((c) => c.embedding && c.cluster_id);

        const best = findBestCluster(candidateEmbedding, parsedCandidates, SIMILARITY_THRESHOLD);

        const clusterId = best.cluster_id || crypto.randomUUID();

        const { error: updateError } = await supabaseAdmin
          .from('ali_narratives')
          .update({ cluster_id: clusterId })
          .eq('id', item.id);

        if (updateError) throw updateError;
        clustered += 1;
      } catch (err) {
        errors.push({ id: item.id, error: err?.message || String(err) });
      }
    }

    return res.status(200).json({ ok: true, clustered, errors });
  } catch (error) {
    console.error('[ali-cluster-cron] Unhandled error:', error);
    return res.status(500).json({ ok: false, error: 'Server error during clustering' });
  }
}
