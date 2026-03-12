/**
 * AO Automation — AI configuration status (owner-only).
 * GET /api/ao/ai/status
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getOpenAiKey } from '../../../lib/openaiKey.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    ok: true,
    configured: !!getOpenAiKey(),
  });
}

