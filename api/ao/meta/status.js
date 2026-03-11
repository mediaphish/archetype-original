/**
 * AO Automation — Meta connection status (Facebook + Instagram).
 * GET /api/ao/meta/status
 *
 * Checks required env vars and verifies the token can access basic endpoints.
 * Does not post anything.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getMetaConnection } from '../../../lib/social/metaConnection.js';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

async function fetchJson(url) {
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireAoSession(req, res);
  if (!auth) return;

  const meta = await getMetaConnection();
  const metaToken = (meta?.token || '').trim();
  const pageId = (meta?.pageId || '').trim();
  const igBusinessId = (meta?.igBusinessId || '').trim();

  const details = {
    facebook: { connected: false, reason: null },
    instagram: { connected: false, reason: null },
  };

  if (!metaToken) {
    details.facebook.reason = 'META_ACCESS_TOKEN is missing';
    details.instagram.reason = 'META_ACCESS_TOKEN is missing';
    return res.status(200).json({ ok: true, ...details });
  }

  // Facebook Page check
  if (!pageId) {
    details.facebook.reason = 'FACEBOOK_PAGE_ID is missing';
  } else {
    const url = `${GRAPH_BASE}/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(metaToken)}`;
    const r = await fetchJson(url);
    if (r.ok && r.json?.id) {
      details.facebook.connected = true;
      details.facebook.page = { id: r.json.id, name: r.json.name || null };
    } else {
      details.facebook.reason = r.json?.error?.message || `Facebook check failed (${r.status})`;
    }
  }

  // Instagram Business check
  if (!igBusinessId) {
    details.instagram.reason = 'INSTAGRAM_BUSINESS_ID is missing';
  } else {
    const url = `${GRAPH_BASE}/${encodeURIComponent(igBusinessId)}?fields=id,username&access_token=${encodeURIComponent(metaToken)}`;
    const r = await fetchJson(url);
    if (r.ok && r.json?.id) {
      details.instagram.connected = true;
      details.instagram.account = { id: r.json.id, username: r.json.username || null };
    } else {
      details.instagram.reason = r.json?.error?.message || `Instagram check failed (${r.status})`;
    }
  }

  return res.status(200).json({
    ok: true,
    facebook: details.facebook,
    instagram: details.instagram,
    source: meta?.source || 'env',
  });
}

