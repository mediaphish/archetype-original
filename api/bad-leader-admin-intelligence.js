import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';
import { buildPatternPrompts } from '../lib/badLeaderAi.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    const { data: stories, error } = await supabaseAdmin
      .from('blp_submissions')
      .select('original_story, tone, status')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const dysfunctionalStories = (stories || [])
      .filter((s) => s.tone === 'dysfunctional')
      .map((s) => s.original_story)
      .filter(Boolean);
    const exemplaryStories = (stories || [])
      .filter((s) => s.tone === 'exemplary')
      .map((s) => s.original_story)
      .filter(Boolean);

    const [dysfunctionalPrompts, exemplaryPrompts] = await Promise.all([
      dysfunctionalStories.length > 0 ? buildPatternPrompts(dysfunctionalStories, 'dysfunctional') : '',
      exemplaryStories.length > 0 ? buildPatternPrompts(exemplaryStories, 'exemplary') : '',
    ]);

    return res.status(200).json({
      ok: true,
      dysfunctionalPrompts,
      exemplaryPrompts,
      counts: {
        dysfunctionalStories: dysfunctionalStories.length,
        exemplaryStories: exemplaryStories.length,
      },
    });
  } catch (error) {
    console.error('[BLP ADMIN INTELLIGENCE] Error:', error);
    return res.status(500).json({ error: 'Failed to run pattern analysis.' });
  }
}
