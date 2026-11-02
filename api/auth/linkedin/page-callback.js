/**
 * GET /api/auth/linkedin/page-callback
 * LinkedIn returns here after the company page sign-in. Saves the connection
 * only if the sign-in really administers the page. Owner only.
 * See lib/social/linkedinPage.js.
 */
import { readAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  PAGE_STATE_COOKIE,
  choosePageUrn,
  exchangePageCode,
  findAdministeredPages,
  pageStateCookieHeader,
  savePageConnection,
} from '../../../lib/social/linkedinPage.js';
import { pageStateMatches } from '../../../lib/social/linkedinPageState.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';

function finish(res, query) {
  res.setHeader('Set-Cookie', pageStateCookieHeader('', 0));
  res.statusCode = 302;
  res.setHeader('Location', `${SITE_URL}/ao/settings?${new URLSearchParams({ provider: 'linkedin_page', ...query })}`);
  res.end();
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export default async function handler(req, res) {
  const session = readAoSession(req);
  if (!session.ok || session.role === 'reviewer') {
    res.statusCode = 302;
    res.setHeader('Location', `${SITE_URL}/ao/login`);
    return res.end();
  }

  const fail = (message) => finish(res, { status: 'error', message });
  const params = new URL(req.url, SITE_URL).searchParams;
  if (params.get('error')) return fail(params.get('error_description') || params.get('error'));
  if (!params.get('code') || !pageStateMatches(params.get('state'), readCookie(req, PAGE_STATE_COOKIE))) {
    return fail('The sign-in expired. Please try again.');
  }

  try {
    const token = await exchangePageCode(params.get('code'));
    const administered = await findAdministeredPages(token.access_token);
    const chosen = choosePageUrn(administered, process.env.LINKEDIN_PAGE_1_URN || null);
    if (chosen.error) return fail(chosen.error);
    await savePageConnection({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      pageUrn: chosen.urn,
    });
    return finish(res, { status: 'connected' });
  } catch (err) {
    console.error('[LinkedIn page callback]', err?.message || err);
    return fail(err?.message || 'The connection failed.');
  }
}
