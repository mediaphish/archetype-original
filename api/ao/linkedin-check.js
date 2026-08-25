/**
 * AO Automation — LinkedIn token diagnostic
 * GET /api/ao/linkedin-check
 *
 * Every LinkedIn Business post has failed with the same error going back to at
 * least 2026-07-10:
 *
 *   "Organization Or Events permissions must be used when using organization as author"
 *
 * That error means the access token does not carry w_organization_social, the
 * scope required to post with an organization URN as the author. The scope is
 * only issued once the app is approved for LinkedIn's Community Management API.
 *
 * Bart has an open support case, and support asks for specifics. This endpoint
 * produces them: it introspects each configured token against LinkedIn's own
 * introspection endpoint and reports what LinkedIn says the token actually
 * holds. That turns "posting doesn't work" into "your own API reports this
 * token has these scopes and not that one," which is a different conversation.
 *
 * SAFETY: this returns scopes, status and expiry only. It never returns a
 * token, a client secret, or any part of either. The token is sent to LinkedIn,
 * which issued it, and nowhere else.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';
import { getSocialCredentials } from '../../lib/social/config.js';
import { getLinkedinVersion } from '../../lib/social/linkedinVersion.js';

const INTROSPECT_URL = 'https://www.linkedin.com/oauth/v2/introspectToken';

/** The scope each author type requires, so the report names what is missing. */
const REQUIRED_SCOPES = {
  personal: ['w_member_social'],
  page_1: ['w_organization_social'],
};

/**
 * Ask LinkedIn what a token actually holds.
 *
 * Introspection needs the app's client id and secret. When those are absent the
 * check degrades to reporting what is configured rather than failing outright —
 * knowing a page URN and token are present is still useful to a support ticket.
 */
async function introspect(token) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      introspected: false,
      reason:
        'LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET are not set in this environment, ' +
        'so the token could not be introspected. Scopes are unknown, not absent.',
    };
  }

  const res = await fetch(INTROSPECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
    }),
  });

  const uuid = res.headers.get('x-li-uuid') || null;

  if (!res.ok) {
    const text = await res.text();
    return {
      introspected: false,
      status: res.status,
      x_li_uuid: uuid,
      reason: text.slice(0, 300),
    };
  }

  const data = await res.json();
  return {
    introspected: true,
    x_li_uuid: uuid,
    active: data.active ?? null,
    status: data.status ?? null,
    // LinkedIn returns scopes as a comma-separated string.
    scopes: String(data.scope || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    auth_type: data.auth_type ?? null,
    expires_at: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null,
    created_at: data.created_at ? new Date(data.created_at * 1000).toISOString() : null,
  };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const accounts = ['personal', 'page_1'];
    const report = [];

    for (const accountId of accounts) {
      const creds = getSocialCredentials('linkedin', accountId);
      if (!creds?.accessToken) {
        report.push({ account_id: accountId, configured: false });
        continue;
      }

      const detail = await introspect(creds.accessToken);
      const required = REQUIRED_SCOPES[accountId] || [];
      const missing = detail.introspected
        ? required.filter((s) => !detail.scopes.includes(s))
        : null;

      report.push({
        account_id: accountId,
        configured: true,
        // Presence only. The URN is not a secret, but the token never appears.
        has_person_urn: Boolean(creds.personUrn),
        has_page_urn: Boolean(creds.pageUrn),
        author_urn: creds.pageUrn || creds.personUrn || null,
        required_scopes: required,
        missing_scopes: missing,
        ...detail,
      });
    }

    return res.status(200).json({
      ok: true,
      linkedin_version: getLinkedinVersion(),
      api_base: 'https://api.linkedin.com/rest',
      post_endpoint: 'https://api.linkedin.com/rest/posts',
      known_error:
        'Organization Or Events permissions must be used when using organization as author',
      note:
        'w_organization_social is granted only with the Community Management API product. ' +
        'If page_1 is missing that scope, the app has not been approved for it and no ' +
        'change to the request body will fix it.',
      accounts: report,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
