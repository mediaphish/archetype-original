/**
 * Signed httpOnly session cookie for podcast guest show pages.
 * Scoped to a single guest record ID + email.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

const COOKIE_NAME = 'podcast_guest_session';
const LINK_TTL_MS = 15 * 60 * 1000;
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
    if (!host || host === 'localhost') return null;
    if (host.endsWith('.vercel.app')) return null;
    const root = host.startsWith('www.') ? host.slice(4) : host;
    if (root.endsWith('archetypeoriginal.com')) return 'archetypeoriginal.com';
    return null;
  } catch {
    return null;
  }
}

function getSessionSecret() {
  return process.env.AO_SESSION_SECRET || '';
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

export function createRandomToken() {
  return randomBytes(32).toString('hex');
}

export function setGuestSessionCookie(res, guestId, emailLower) {
  const secret = getSessionSecret();
  if (!secret) return false;

  const now = Date.now();
  const payload = {
    guest_id: String(guestId),
    email: String(emailLower || '').toLowerCase().trim(),
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  if (!signature) return false;

  setCookie(res, `${payloadB64}.${signature}`, SESSION_MAX_AGE_SECONDS);
  return true;
}

export function readGuestSession(req) {
  const secret = getSessionSecret();
  if (!secret) return { ok: false, error: 'not_configured' };

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

  const guestId = String(payload?.guest_id || '').trim();
  const email = String(payload?.email || '').toLowerCase().trim();
  const exp = Number(payload?.exp || 0);
  if (!guestId || !email || !exp) return { ok: false, error: 'invalid' };
  if (Date.now() > exp) return { ok: false, error: 'expired' };

  return { ok: true, guest_id: guestId, email };
}

export function requireGuestSession(req, res, guestId) {
  const session = readGuestSession(req);
  if (!session.ok) {
    res.status(401).json({ ok: false, error: 'Not signed in' });
    return null;
  }
  if (String(guestId) !== String(session.guest_id)) {
    res.status(403).json({ ok: false, error: 'Access denied' });
    return null;
  }
  return session;
}

export async function storeGuestMagicLink(guestId, token) {
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  const { error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .update({
      magic_link_token: token,
      magic_link_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', guestId);

  if (error) throw new Error(error.message);
  return { token, expiresAt };
}

export async function consumeGuestMagicLink({ guestId, email, token }) {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('id, email, magic_link_token, magic_link_expires_at')
    .eq('id', guestId)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'invalid' };
  if (String(data.email || '').toLowerCase().trim() !== String(email).toLowerCase().trim()) {
    return { ok: false, reason: 'invalid' };
  }
  if (!data.magic_link_token || data.magic_link_token !== token) {
    return { ok: false, reason: 'invalid' };
  }
  if (!data.magic_link_expires_at || new Date(data.magic_link_expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  await supabaseAdmin
    .from('ao_podcast_guests')
    .update({
      magic_link_token: null,
      magic_link_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', guestId);

  return { ok: true, guest: data };
}

export async function sendGuestMagicLinkEmail({ guest, req }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  if (!resendApiKey || !from) {
    return { ok: false, error: 'Email is not configured.' };
  }

  const token = createRandomToken();
  await storeGuestMagicLink(guest.id, token);

  const baseUrl = getSiteUrl();
  const email = String(guest.email || '').toLowerCase().trim();
  const magicLink = `${baseUrl}/api/podcast/guest-magic-verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&guest_id=${encodeURIComponent(guest.id)}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1A1A; line-height: 1.6;">
      <h1 style="font-family: Georgia, serif; font-weight: 400;">Your podcast guest page</h1>
      <p>Hi ${guest.name || 'there'},</p>
      <p>Use the secure link below to view your private guest show page — your bio, links, and intake answers.</p>
      <p><a href="${magicLink}" style="display:inline-block;background:#DB0812;color:#fff;padding:12px 20px;text-decoration:none;border-radius:2px;">View my guest page</a></p>
      <p style="color:#6B6B6B;font-size:13px;">This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
      <p style="font-size:12px;color:#6B6B6B;">${magicLink}</p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Archetype Original Podcast guest page',
      html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to send email: ${errText}`);
  }

  return {
    ok: true,
    ...(process.env.NODE_ENV !== 'production' ? { link: magicLink } : {}),
  };
}
