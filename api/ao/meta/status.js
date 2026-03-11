/**
 * AO Automation — Meta connection status (Facebook + Instagram).
 * GET /api/ao/meta/status
 *
 * Checks required env vars and verifies the token can access basic endpoints.
 * Does not post anything.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

function envStatus() {
  const metaToken = (process.env.META_ACCESS_TOKEN || '').trim();
  const pageId = (process.env.FACEBOOK_PAGE_ID || '').trim();
  const igBusinessId = (process.env.INSTAGRAM_BUSINESS_ID || '').trim();

  return {
    metaTokenPresent: !!metaToken,
    pageIdPresent: !!pageId,
    igBusinessIdPresent: !!igBusinessId,
    metaToken,
    pageId,
    igBusinessId,
  };
}

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

  const env = envStatus();
  const details = {
    facebook: { connected: false, reason: null },
    instagram: { connected: false, reason: null },
  };

  if (!env.metaTokenPresent) {
    details.facebook.reason = 'META_ACCESS_TOKEN is missing';
    details.instagram.reason = 'META_ACCESS_TOKEN is missing';
    return res.status(200).json({ ok: true, ...details, env: { pageIdPresent: env.pageIdPresent, igBusinessIdPresent: env.igBusinessIdPresent, metaTokenPresent: env.metaTokenPresent } });
  }

  // Facebook Page check
  if (!env.pageIdPresent) {
    details.facebook.reason = 'FACEBOOK_PAGE_ID is missing';
  } else {
    const url = `${GRAPH_BASE}/${encodeURIComponent(env.pageId)}?fields=id,name&access_token=${encodeURIComponent(env.metaToken)}`;
    const r = await fetchJson(url);
    if (r.ok && r.json?.id) {
      details.facebook.connected = true;
      details.facebook.page = { id: r.json.id, name: r.json.name || null };
    } else {
      details.facebook.reason = r.json?.error?.message || `Facebook check failed (${r.status})`;
    }
  }

  // Instagram Business check
  if (!env.igBusinessIdPresent) {
    details.instagram.reason = 'INSTAGRAM_BUSINESS_ID is missing';
  } else {
    const url = `${GRAPH_BASE}/${encodeURIComponent(env.igBusinessId)}?fields=id,username&access_token=${encodeURIComponent(env.metaToken)}`;
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
  });
}

