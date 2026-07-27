/**
 * ALI Session — signed, tamper-proof session tokens (no external session store needed).
 *
 * A session token is base64url(JSON payload) + '.' + HMAC-SHA256 signature of that payload,
 * using ALI_SESSION_SECRET. Verifying recomputes the signature and compares it — if the payload
 * was tampered with (e.g. a different companyId), the signature won't match and verification fails.
 *
 * This avoids adding a JWT library dependency; it's the same idea (signed claims), hand-rolled
 * with Node's built-in crypto, which this codebase already has zero external session dependency for.
 */

import crypto from 'crypto';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.ALI_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'ALI_SESSION_SECRET is missing or too short. Set a random 64+ character value in the environment before ALI auth will work.'
    );
  }
  return secret;
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/**
 * @param {object} claims - { contactId, companyId, email, isSuperAdmin }
 * @returns {string} signed session token
 */
export function createSessionToken(claims) {
  const payload = {
    ...claims,
    iat: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * @param {string} token
 * @returns {object|null} the verified claims, or null if invalid/expired/tampered
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  let expectedSignature;
  try {
    expectedSignature = sign(payloadB64);
  } catch (_) {
    return null;
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }

  if (!payload.iat || Date.now() - payload.iat > SESSION_MAX_AGE_MS) return null;

  return payload;
}

export function sessionCookieHeader(token) {
  const maxAgeSeconds = Math.floor(SESSION_MAX_AGE_MS / 1000);
  return `ali_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookieHeader() {
  return `ali_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

/**
 * Require a valid ALI session cookie. Sends 401 and returns null if missing/invalid.
 * @returns {Promise<{contactId, companyId, email, isSuperAdmin}|null>}
 */
export async function requireAliSession(req, res) {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies.ali_session;
  const claims = verifySessionToken(token);
  if (!claims) {
    res.status(401).json({ ok: false, error: 'Not signed in. Please log in again.' });
    return null;
  }
  return claims;
}
