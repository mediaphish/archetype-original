/**
 * Record an Archy funnel event.
 *
 * Why this exists, 2026-09-10: archy_questions held 10 rows in three weeks and
 * all ten were Bart's own testing. That number is unreadable on its own,
 * because nothing recorded how many people saw Archy and did not ask. Ten
 * questions against ten thousand impressions and ten questions against twelve
 * are different problems with different fixes, and the site could not tell
 * which one it had.
 *
 * The events, in order:
 *
 *   shown            the launcher rendered on a page
 *   opened           someone opened the panel
 *   prompt_clicked   someone used a suggested prompt
 *   asked            a question was sent
 *   closed           the panel was dismissed
 *
 * Fire and forget. A failure here must never affect the page: analytics that
 * can break a visit are worse than no analytics.
 *
 * No personal data. A rotating client-side session id, a path, and an event
 * name. Nothing is joined to a person.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { cleanPath, isArchyEvent, pageTypeOf } from '../../lib/ao/archyEngagement.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const event = String(body.event || '').trim();

    if (!isArchyEvent(event)) {
      return res.status(400).json({ error: 'Unknown event' });
    }

    const path = cleanPath(body.path);
    const sessionId = String(body.sessionId || '').trim().slice(0, 100) || null;

    const { error } = await supabaseAdmin.from('archy_engagement_events').insert([
      {
        session_id: sessionId,
        event,
        path,
        page_type: pageTypeOf(path),
        meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
      },
    ]);

    if (error) {
      // Logged, not surfaced. The visitor gets a 204 either way.
      console.error('[archy-engagement] insert failed:', error.message);
    }

    return res.status(204).end();
  } catch (err) {
    console.error('[archy-engagement] threw:', err?.message || err);
    // Still 204. This endpoint has no business reporting failure to a page.
    return res.status(204).end();
  }
}
