/**
 * AO Automation — LinkedIn connection status (no tokens exposed).
 * GET /api/ao/linkedin/status?email=xxx
 * Returns { ok: true, state: 'connected'|'not_connected'|'needs_reconnect', connected: boolean }.
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

async function validateAccessToken(accessToken) {
  try {
    const res = await fetch(LINKEDIN_USERINFO_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true };
    const msg = json?.message || json?.error_description || json?.error || json?.serviceErrorCode || null;
    return { ok: false, status: res.status, message: typeof msg === 'string' ? msg : null };
  } catch (e) {
    return { ok: false, status: 0, message: e.message || 'Could not validate token' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('id, access_token')
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    if (!data?.id) {
      return res.status(200).json({ ok: true, connected: false, state: 'not_connected' });
    }

    // If we have a stored token, do a lightweight validation so we can distinguish
    // "not connected" vs "needs reconnect".
    const token = (data.access_token || '').trim();
    if (!token) {
      return res.status(200).json({ ok: true, connected: false, state: 'needs_reconnect', reason: 'Missing LinkedIn access token' });
    }

    const validated = await validateAccessToken(token);
    if (validated.ok) {
      return res.status(200).json({ ok: true, connected: true, state: 'connected' });
    }

    // If LinkedIn says token is invalid/expired, show "needs reconnect".
    return res.status(200).json({
      ok: true,
      connected: false,
      state: 'needs_reconnect',
      reason: validated.message || (validated.status ? `LinkedIn token rejected (${validated.status})` : 'LinkedIn token rejected'),
    });
  } catch (e) {
    console.error('[ao/linkedin/status]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
