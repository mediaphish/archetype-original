/**
 * GET /api/ao/reviewer/settings
 *
 * Reviewer-scoped settings data — LinkedIn connection status only.
 * Read-only. No reconnect action is exposed through this endpoint or any
 * reviewer-facing route; reconnecting is a real production action.
 *
 * Reuses the same token-check logic as api/ao/linkedin/status.js, but only
 * returns connected / state — never tokens, reasons, or account IDs.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

async function validateAccessToken(accessToken) {
  try {
    const res = await fetch(LINKEDIN_USERINFO_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (auth.role !== 'reviewer') {
    return res.status(403).json({ ok: false, error: 'This endpoint is reviewer-only.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('id, access_token')
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return res.status(200).json({
        ok: true,
        linkedin: { connected: false, state: 'not_connected' },
      });
    }

    const token = String(data.access_token || '').trim();
    if (!token) {
      return res.status(200).json({
        ok: true,
        linkedin: { connected: false, state: 'not_connected' },
      });
    }

    const validated = await validateAccessToken(token);
    if (validated.ok) {
      return res.status(200).json({
        ok: true,
        linkedin: { connected: true, state: 'connected' },
      });
    }

    return res.status(200).json({
      ok: true,
      linkedin: { connected: false, state: 'not_connected' },
    });
  } catch (err) {
    console.error('[reviewer/settings]', err?.message || err);
    return res.status(200).json({
      ok: true,
      linkedin: { connected: false, state: 'not_connected' },
    });
  }
}
