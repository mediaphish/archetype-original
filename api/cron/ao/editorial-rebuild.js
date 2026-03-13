/**
 * Vercel cron: rebuild AO editorial memory (shared newsroom loop).
 * Secured by CRON_SECRET if set.
 *
 * This keeps the "memory" reasonably fresh even if we miss an event.
 */

import { rebuildEditorialMemory } from '../../../lib/ao/editorialMemory.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.query?.secret || '';
    const provided = auth.replace(/^Bearer\s+/i, '') || (req.query?.secret ?? '');
    if (provided !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  const ownerEmail = String(process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
  if (!ownerEmail) {
    return res.status(503).json({ ok: false, error: 'AO_OWNER_EMAIL not configured' });
  }

  try {
    const result = await rebuildEditorialMemory({ email: ownerEmail });
    if (!result.ok) return res.status(500).json({ ok: false, ...result });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Rebuild failed' });
  }
}

