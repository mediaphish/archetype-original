import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import {
  getPodcastCombinedShowNotes,
  setPodcastCombinedShowNotes,
} from '../../../../lib/ao/autoHub.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const threadId = String(req.query?.thread_id || '').trim();
      if (!threadId) {
        return res.status(400).json({ ok: false, error: 'thread_id required' });
      }

      const notes = await getPodcastCombinedShowNotes(auth.email, threadId);
      return res.status(200).json({ ok: true, ...notes });
    } catch (err) {
      console.error('[ao/podcast/episode/show-notes GET]', err);
      const status = err.message === 'Thread not found' ? 404 : 500;
      return res.status(status).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const threadId = String(body.thread_id || '').trim();
      if (!threadId) {
        return res.status(400).json({ ok: false, error: 'thread_id required' });
      }

      const combinedShowNotesMd =
        body.combined_show_notes_md == null ? '' : String(body.combined_show_notes_md);

      await setPodcastCombinedShowNotes(auth.email, threadId, combinedShowNotesMd);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[ao/podcast/episode/show-notes POST]', err);
      const status = err.message === 'Thread not found' ? 404 : 500;
      return res.status(status).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
