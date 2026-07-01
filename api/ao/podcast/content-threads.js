import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_episode_drafts')
      .select('id, title, slug, status, updated_at, thematic_threads')
      .in('status', ['approved', 'published'])
      .order('updated_at', { ascending: false });

    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return res.status(503).json({ ok: false, error: 'episode_drafts_table_missing' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    const threads = [];
    for (const row of data || []) {
      const list = Array.isArray(row.thematic_threads) ? row.thematic_threads : [];
      for (const item of list) {
        if (!item?.thread) continue;
        threads.push({
          thread: item.thread,
          description: item.description || '',
          suggested_follow_up: item.suggested_follow_up || '',
          episode_id: row.id,
          episode_title: row.title || 'Untitled',
          episode_slug: row.slug || '',
          episode_status: row.status,
          updated_at: row.updated_at,
        });
      }
    }

    threads.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return res.status(200).json({ ok: true, threads });
  } catch (err) {
    console.error('[ao/podcast/content-threads]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
