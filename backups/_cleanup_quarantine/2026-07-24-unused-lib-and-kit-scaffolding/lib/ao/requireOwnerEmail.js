/**
 * AO Automation — Require owner email for API handlers.
 * Reads email from query.email or x-ao-email header; if AO_OWNER_EMAIL is set, requires match.
 * Returns { email } or sends 401/403 and returns null (caller should return after).
 */

const OWNER_EMAIL = (process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {{ email: string } | null}
 */
export function requireOwnerEmail(req, res) {
  const email = (req.query?.email || req.headers?.['x-ao-email'] || '').toLowerCase().trim();
  if (!email) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Email required' }));
    return null;
  }
  if (OWNER_EMAIL && email !== OWNER_EMAIL) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Not authorized' }));
    return null;
  }
  return { email };
}
