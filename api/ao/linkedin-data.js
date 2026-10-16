/**
 * What LinkedIn data this app holds, and the control that erases it.
 *
 * GET  /api/ao/linkedin-data            what is held right now, nothing changed
 * POST /api/ao/linkedin-data  {confirm} erase all of it
 *
 * 2026-10-16. LinkedIn asked whether the organization can securely delete all
 * data obtained via their Community Management APIs if required. This is the
 * answer, and it is deliberately a screen rather than a script, so it can be
 * shown working during the review video instead of described.
 *
 * Owner session only. This is a one-member application: Bart is the only
 * account and the only member whose data is involved, so there is no other
 * person's data to protect here and no multi-tenant boundary to cross.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { deleteAllLinkedInData, describeLinkedInDataHeld } from '../../lib/social/linkedinDataDeletion.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const held = await describeLinkedInDataHeld();
    return res.status(held.ok ? 200 : 500).json(held);
  }

  if (req.method === 'POST') {
    // Deliberate and irreversible, so it takes a word rather than a click.
    // Deleting the tokens disconnects LinkedIn until it is reconnected.
    if (String(req.body?.confirm || '').trim().toUpperCase() !== 'DELETE') {
      return res.status(400).json({
        ok: false,
        error: 'Send confirm: "DELETE" to erase all LinkedIn data. This disconnects LinkedIn until you reconnect.',
      });
    }

    const result = await deleteAllLinkedInData();
    return res.status(result.ok ? 200 : 500).json(result);
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
