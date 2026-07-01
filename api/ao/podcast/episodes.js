import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { listAllEpisodeDrafts } from '../../../lib/ao/episodeDraftStore.js';

const STATUS_ORDER = { draft: 0, approved: 1, rejected: 2, published: 3 };

function episodeRow(draft) {
  const guestName = draft.guest?.name || '';
  const publishDate =
    draft.status === 'published'
      ? draft.recorded_date || draft.meta?.publish_date || draft.updated_at?.split('T')[0] || ''
      : '';

  return {
    id: draft.draft_id,
    title: draft.title || 'Untitled',
    episode_type: draft.episode_type || 'solo',
    guest_name: guestName,
    status: draft.status || 'draft',
    publish_date: publishDate,
    updated_at: draft.updated_at,
    slug: draft.slug || '',
  };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await listAllEpisodeDrafts();
    if (!result.ok) {
      const status = result.error === 'episode_drafts_table_missing' ? 503 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }

    const episodes = (result.drafts || [])
      .map(episodeRow)
      .sort((a, b) => {
        const aPub = a.status === 'published' ? 1 : 0;
        const bPub = b.status === 'published' ? 1 : 0;
        if (aPub !== bPub) return aPub - bPub;
        const aOrder = STATUS_ORDER[a.status] ?? 0;
        const bOrder = STATUS_ORDER[b.status] ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

    return res.status(200).json({ ok: true, episodes });
  } catch (err) {
    console.error('[ao/podcast/episodes]', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
