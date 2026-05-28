/**
 * GET /api/ao/auto/confirm-live?url=https://...
 *
 * Checks whether a URL is live and returning a 200 response.
 * Used to confirm a journal entry is live after GitHub commit + Vercel deploy.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url || !url.startsWith('https://')) {
    return res.status(400).json({ ok: false, error: 'A valid https URL is required' });
  }

  const MAX_ATTEMPTS = 8;
  const DELAY_MS = 15000; // 15 seconds between attempts

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const checkRes = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (checkRes.ok) {
        return res.status(200).json({
          ok: true,
          live: true,
          url,
          attempts: attempt,
          message: `Page is live after ${attempt} attempt${attempt === 1 ? '' : 's'}.`,
        });
      }
    } catch (_) {
      // Not live yet — keep trying
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return res.status(200).json({
    ok: false,
    live: false,
    url,
    attempts: MAX_ATTEMPTS,
    message: `Page did not go live after ${MAX_ATTEMPTS} attempts (${(MAX_ATTEMPTS * DELAY_MS) / 1000}s). Vercel deploy may still be in progress. Check manually.`,
  });
}
