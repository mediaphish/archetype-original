/**
 * AO Automation — Owner-only session via signed httpOnly cookie.
 *
 * After Magic Link verification, the server sets a signed cookie that proves:
 * - the request is from the signed-in browser
 * - the session is not expired
 * - the session belongs to AO_OWNER_EMAIL (single owner)
 *
 * This replaces "email in querystring" as authorization for /ao.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'ao_session';
const OWNER_EMAIL = (process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSiteUrl() {
  return process.env.SITE_URL || 'https://www.archetypeoriginal.com';
}

function isSecureCookie() {
  return getSiteUrl().startsWith('https');
}

function getCookieDomain() {
  try {
    const url = new URL(getSiteUrl());
    const host = (url.hostname || '').toLowerCase();
    if (!host) return null;
    if (host === 'localhost') return null;
    if (host.endsWith('.vercel.app')) return null;
    const root = host.startsWith('www.') ? host.slice(4) : host;
    if (root.endsWith('archetypeoriginal.com')) return 'archetypeoriginal.com';
    return null;
  } catch {
    return null;
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input) {
  const b64 = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  return Buffer.from(b64 + pad, 'base64').toString('utf-8');
}

function getSessionSecret() {
  return process.env.AO_SESSION_SECRET || '';
}

function sign(payloadB64) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(payloadB64).digest('hex');
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const out = {};
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent((v.join('=') || '').trim());
  }
  return out;
}

function setCookie(res, value, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  const domain = getCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (isSecureCookie()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAoSessionCookie(res) {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  const domain = getCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (isSecureCookie()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function setAoSessionCookie(res, emailLower) {
  const secret = getSessionSecret();
  if (!secret) return false;

  const now = Date.now();
  const payload = {
    email: String(emailLower || '').toLowerCase().trim(),
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  if (!signature) return false;

  const token = `${payloadB64}.${signature}`;
  setCookie(res, token, SESSION_MAX_AGE_SECONDS);
  return true;
}

export function readAoSession(req) {
  const secret = getSessionSecret();
  if (!secret) return { ok: false, error: 'not_configured' };
  if (!OWNER_EMAIL) return { ok: false, error: 'owner_not_configured' };

  const cookieHeader = req.headers.cookie || req.headers.Cookie;
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return { ok: false, error: 'missing' };

  const idx = token.lastIndexOf('.');
  if (idx <= 0) return { ok: false, error: 'invalid' };
  const payloadB64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  const expected = sign(payloadB64);
  if (!expected) return { ok: false, error: 'not_configured' };
  try {
    const a = Buffer.from(String(sig));
    const b = Buffer.from(String(expected));
    if (a.length !== b.length) return { ok: false, error: 'invalid' };
    if (!timingSafeEqual(a, b)) return { ok: false, error: 'invalid' };
  } catch {
    return { ok: false, error: 'invalid' };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { ok: false, error: 'invalid' };
  }

  const email = String(payload?.email || '').toLowerCase().trim();
  const exp = Number(payload?.exp || 0);
  if (!email || !exp) return { ok: false, error: 'invalid' };
  if (Date.now() > exp) return { ok: false, error: 'expired' };
  if (email !== OWNER_EMAIL) return { ok: false, error: 'not_owner' };

  return { ok: true, email };
}

export function requireAoSession(req, res) {
  const session = readAoSession(req);
  if (session.ok) return { email: session.email };

  if (session.error === 'not_configured' || session.error === 'owner_not_configured') {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Login not configured' }));
    return null;
  }

  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: 'Not signed in' }));
  return null;
}

