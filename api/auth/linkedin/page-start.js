/**
 * GET /api/auth/linkedin/page-start
 * Starts the company page sign-in with the AO Page Publisher app. Owner only.
 * See lib/social/linkedinPage.js.
 */
import { readAoSession } from '../../../lib/ao/requireAoSession.js';
import { newPageState, pageAppMissing, pageAuthUrl, pageStateCookieHeader } from '../../../lib/social/linkedinPage.js';

const SITE_URL = process.env.SITE_URL || 'https://www.archetypeoriginal.com';

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

const toSettings = (message) => `${SITE_URL}/ao/settings?provider=linkedin_page&status=error&message=${encodeURIComponent(message)}`;

export default async function handler(req, res) {
  const session = readAoSession(req);
  if (!session.ok) return redirect(res, `${SITE_URL}/ao/login`);
  if (session.role === 'reviewer') return redirect(res, toSettings('Only the owner can connect the company page.'));

  const missing = pageAppMissing();
  if (missing.length) return redirect(res, toSettings(`The site is missing ${missing.join(' and ')}.`));

  const pending = newPageState();
  if (!pending) return redirect(res, toSettings('Could not start the connection.'));

  res.setHeader('Set-Cookie', pageStateCookieHeader(pending.cookie, 600));
  return redirect(res, pageAuthUrl(pending.state));
}
