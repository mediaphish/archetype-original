/**
 * POST /api/ao/corpus/drafts/:id/hero-image
 * Body: { action: 'generate' | 'regenerate' | 'approve' | 'reject' }
 */

import { supabaseAdmin } from '../../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../../lib/ao/requireAoSession.js';
import {
  generateRapidWriteHeroForDraft,
  setRapidWriteHeroStatus,
} from '../../../../../lib/ao/rapidWriteImage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const action = String(body.action || 'generate').toLowerCase();

  try {
    if (action === 'generate') {
      const out = await generateRapidWriteHeroForDraft(supabaseAdmin, id, auth.email, { force: false });
      if (!out.ok) return res.status(400).json({ ok: false, error: out.error, draft: out.draft });
      return res.status(200).json({ ok: true, draft: out.draft });
    }
    if (action === 'regenerate') {
      const out = await generateRapidWriteHeroForDraft(supabaseAdmin, id, auth.email, { force: true });
      if (!out.ok) return res.status(400).json({ ok: false, error: out.error, draft: out.draft });
      return res.status(200).json({ ok: true, draft: out.draft });
    }
    if (action === 'approve') {
      const out = await setRapidWriteHeroStatus(supabaseAdmin, id, auth.email, 'approved');
      if (!out.ok) return res.status(400).json({ ok: false, error: out.error, draft: out.draft });
      return res.status(200).json({ ok: true, draft: out.draft });
    }
    if (action === 'reject') {
      const out = await setRapidWriteHeroStatus(supabaseAdmin, id, auth.email, 'rejected');
      if (!out.ok) return res.status(400).json({ ok: false, error: out.error, draft: out.draft });
      return res.status(200).json({ ok: true, draft: out.draft });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    console.error('[ao/corpus/drafts/id/hero-image]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
