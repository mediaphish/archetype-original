import { supabaseAdmin } from '../lib/supabase-admin.js';

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 12), 50);
    const offset = (page - 1) * limit;

    const region = req.query.region ? String(req.query.region) : null;
    const industry = req.query.industry ? String(req.query.industry) : null;
    const condition = req.query.condition ? String(req.query.condition).toLowerCase() : null;
    const tone = req.query.tone ? String(req.query.tone).toLowerCase() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const clusterId = req.query.clusterId ? String(req.query.clusterId) : null;

    let query = supabaseAdmin
      .from('blp_stories')
      .select(
        'id, region, industry, neutralized_text, tone, ali_conditions, scoreboard_leadership, thumbs_up_count, cluster_id, published_at, created_at',
        { count: 'exact' }
      )
      .eq('status', 'approved')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (region) query = query.eq('region', region);
    if (industry) query = query.eq('industry', industry);
    if (condition) query = query.contains('ali_conditions', [condition]);
    if (tone && ['dysfunctional', 'exemplary'].includes(tone)) query = query.eq('tone', tone);
    if (clusterId) query = query.eq('cluster_id', clusterId);
    if (search) query = query.textSearch('neutralized_text', search, { type: 'plain', config: 'english' });

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return res.status(200).json({
      stories: data || [],
      total: count || 0,
      page,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    });
  } catch (error) {
    console.error('[BLP STORIES] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch stories.' });
  }
}
