/**
 * AO Newsroom Shared Memory Loop
 * GET /api/ao/editorial/settings
 * PATCH /api/ao/editorial/settings  { beat_priorities: string[] }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getEditorialSettings, saveEditorialSettings } from '../../../lib/ao/editorialMemory.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;
  const email = auth.email;

  if (req.method === 'GET') {
    const out = await getEditorialSettings({ email });
    if (!out.ok) return res.status(500).json({ ok: false, error: out.error || 'Could not load settings' });
    return res.status(200).json({ ok: true, settings: out.settings });
  }

  if (req.method === 'PATCH') {
    const beat = req.body?.beat_priorities;
    const out = await saveEditorialSettings({ email, beatPriorities: beat });
    if (!out.ok) return res.status(500).json({ ok: false, error: out.error || 'Could not save settings' });
    return res.status(200).json({ ok: true, settings: out.settings });
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

