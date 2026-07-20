/**
 * GET /api/ao/reviewer/settings
 *
 * Reviewer-scoped settings data — connection status for all four platforms
 * this tool publishes to: LinkedIn, Facebook, Instagram, X. Matches the real
 * Settings page. Reconnect and test-post actions are real buttons on the
 * reviewer page (wired to the same routes the owner uses) — the reviewer is
 * instructed out-of-band not to click them, since they are genuine
 * production actions, not sandboxed demo actions.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getMetaConnection } from '../../../lib/social/metaConnection.js';
import { getXAccessToken } from '../../../lib/social/xConnection.js';

const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

async function checkLinkedIn() {
  try {
    const { data } = await supabaseAdmin
      .from('ao_linkedin_tokens')
      .select('access_token')
      .limit(1)
      .maybeSingle();

    const token = String(data?.access_token || '').trim();
    if (!token) return { connected: false };

    const res = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { connected: res.ok };
  } catch {
    return { connected: false };
  }
}

async function checkMeta() {
  try {
    const meta = await getMetaConnection();
    const token = (meta?.token || '').trim();
    const pageId = (meta?.pageId || '').trim();
    const igId = (meta?.igBusinessId || '').trim();

    if (!token) return { facebook: false, instagram: false };

    const [fbRes, igRes] = await Promise.all([
      pageId
        ? fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}?fields=id&access_token=${encodeURIComponent(token)}`)
        : null,
      igId
        ? fetch(`${GRAPH_BASE}/${encodeURIComponent(igId)}?fields=id&access_token=${encodeURIComponent(token)}`)
        : null,
    ]);

    return {
      facebook: !!(fbRes && fbRes.ok),
      instagram: !!(igRes && igRes.ok),
    };
  } catch {
    return { facebook: false, instagram: false };
  }
}

async function checkX() {
  try {
    const token = await getXAccessToken();
    return { connected: !!(token?.ok && token?.accessToken) };
  } catch {
    return { connected: false };
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

  const [linkedin, meta, x] = await Promise.all([checkLinkedIn(), checkMeta(), checkX()]);

  return res.status(200).json({
    ok: true,
    linkedin: { connected: linkedin.connected },
    facebook: { connected: meta.facebook },
    instagram: { connected: meta.instagram },
    twitter: { connected: x.connected },
  });
}
