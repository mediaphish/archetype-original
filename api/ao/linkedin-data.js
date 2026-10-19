/**
 * What LinkedIn data this app holds, and the controls that erase it.
 *
 * GET  /api/ao/linkedin-data                      what is held right now, plus
 *                                                 recent LinkedIn post counts
 * POST /api/ao/linkedin-data  {confirm: DELETE}   erase all of it
 * POST /api/ao/linkedin-data  {action: disconnect} remove the tokens only
 *
 * 2026-10-16. LinkedIn asked whether the organization can securely delete all
 * data obtained via their Community Management APIs if required. This is the
 * answer, and it is deliberately a screen rather than a script, so it can be
 * shown working during the review video instead of described. The screen is
 * the LinkedIn section of /ao/settings, which reads this endpoint.
 *
 * Reading is open to any AO session. Changing anything is owner only: the
 * reviewer login exists so LinkedIn can look around, and it must not be able
 * to disconnect or erase the account it is reviewing.
 */

import { requireAoSession, requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import {
  deleteAllLinkedInData,
  describeLinkedInDataHeld,
  disconnectLinkedIn,
  recentLinkedInPostCounts,
} from '../../lib/social/linkedinDataDeletion.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = requireAoSession(req, res);
    if (!auth) return;
    const held = await describeLinkedInDataHeld();
    const posts = await recentLinkedInPostCounts();
    return res.status(held.ok ? 200 : 500).json({ ...held, posts });
  }

  if (req.method === 'POST') {
    const auth = requireOwnerSession(req, res);
    if (!auth) return;

    if (String(req.body?.action || '').trim().toLowerCase() === 'disconnect') {
      const result = await disconnectLinkedIn();
      return res.status(result.ok ? 200 : 500).json(result);
    }

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
