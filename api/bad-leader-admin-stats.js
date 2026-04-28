import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';

const CONDITIONS = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'drift'];

function getConditionCounts(stories) {
  const out = Object.fromEntries(CONDITIONS.map((c) => [c, 0]));
  for (const story of stories) {
    const list = Array.isArray(story.ali_conditions) ? story.ali_conditions : [];
    for (const condition of list) {
      const key = String(condition).toLowerCase();
      if (key in out) out[key] += 1;
    }
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    const [{ data: submissions, count: submissionCount, error: subErr }, { data: stories, count: storyCount, error: storyErr }, { data: clusters, count: clusterCount, error: clusterErr }] =
      await Promise.all([
        supabaseAdmin.from('blp_submissions').select('id, status', { count: 'exact' }),
        supabaseAdmin
          .from('blp_stories')
          .select('id, tone, ali_conditions, scoreboard_leadership, region, industry, status, cluster_id, created_at', { count: 'exact' })
          .in('status', ['approved', 'pending']),
        supabaseAdmin.from('blp_clusters').select('id, tone, label, created_at', { count: 'exact' }),
      ]);
    if (subErr) throw subErr;
    if (storyErr) throw storyErr;
    if (clusterErr) throw clusterErr;

    const approvedStories = (stories || []).filter((s) => s.status === 'approved');
    const dysfunctional = approvedStories.filter((s) => s.tone === 'dysfunctional');
    const exemplary = approvedStories.filter((s) => s.tone === 'exemplary');
    const dysfunctionalCounts = getConditionCounts(dysfunctional);
    const exemplaryCounts = getConditionCounts(exemplary);

    const healthIndex = CONDITIONS.map((condition) => {
      const bad = dysfunctionalCounts[condition] || 0;
      const good = exemplaryCounts[condition] || 0;
      const total = bad + good;
      return {
        condition,
        dysfunctionalCount: bad,
        exemplaryCount: good,
        dysfunctionalPct: total > 0 ? Math.round((bad / total) * 100) : 0,
        exemplaryPct: total > 0 ? Math.round((good / total) * 100) : 0,
      };
    });

    const byRegion = {};
    const byIndustry = {};
    for (const story of approvedStories) {
      byRegion[story.region] = (byRegion[story.region] || 0) + 1;
      byIndustry[story.industry] = (byIndustry[story.industry] || 0) + 1;
    }

    const clusterMap = new Map((clusters || []).map((cluster) => [cluster.id, { ...cluster, count: 0, topCondition: null }]));
    for (const story of approvedStories) {
      if (!story.cluster_id || !clusterMap.has(story.cluster_id)) continue;
      clusterMap.get(story.cluster_id).count += 1;
    }

    return res.status(200).json({
      totals: {
        submissions: submissionCount || 0,
        publishedStories: approvedStories.length,
        stories: storyCount || 0,
        clusters: clusterCount || 0,
        industriesRepresented: Object.keys(byIndustry).length,
      },
      queue: {
        pending: (submissions || []).filter((s) => s.status === 'pending').length,
        flagged: (submissions || []).filter((s) => s.status === 'flagged').length,
      },
      dysfunctional: {
        total: dysfunctional.length,
        conditionCounts: dysfunctionalCounts,
        scoreboardPct:
          dysfunctional.length > 0
            ? Math.round((dysfunctional.filter((s) => s.scoreboard_leadership).length / dysfunctional.length) * 100)
            : 0,
      },
      exemplary: {
        total: exemplary.length,
        conditionCounts: exemplaryCounts,
      },
      healthIndex,
      byRegion,
      byIndustry,
      clusters: Array.from(clusterMap.values()).sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error('[BLP ADMIN STATS] Error:', error);
    return res.status(500).json({ error: 'Failed to load stats.' });
  }
}
