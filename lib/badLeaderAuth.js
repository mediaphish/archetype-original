import crypto from 'crypto';
import { supabaseAdmin } from './supabase-admin.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LINK_TTL_MS = 15 * 60 * 1000;

export function createRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function getVoteKey(req) {
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  const ua = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}

export async function createMagicLinkToken(email, req) {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
  const ua = req.headers['user-agent'] || null;

  const { error } = await supabaseAdmin.from('blp_magic_link_tokens').insert({
    email,
    token,
    expires_at: expiresAt,
    used: false,
    ip_address: ip,
    user_agent: ua,
  });
  if (error) throw error;
  return { token, expiresAt };
}

export async function consumeMagicLinkToken(email, token) {
  const { data, error } = await supabaseAdmin
    .from('blp_magic_link_tokens')
    .select('*')
    .eq('email', email)
    .eq('token', token)
    .eq('used', false)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'invalid' };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };

  await supabaseAdmin
    .from('blp_magic_link_tokens')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { ok: true };
}

export async function createAdminSession(email) {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error } = await supabaseAdmin.from('blp_admin_sessions').insert({
    email,
    token,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return { token, expiresAt };
}

export async function getValidAdminSession(sessionToken) {
  if (!sessionToken) return null;
  const { data, error } = await supabaseAdmin
    .from('blp_admin_sessions')
    .select('*')
    .eq('token', sessionToken)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function requireBlpAdmin(req, res) {
  const token = req.headers['x-blp-admin-token'] || req.query?.token || req.body?.token;
  const session = await getValidAdminSession(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
