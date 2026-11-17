/**
 * Security (2026-11-16 ALI audit): admin access comes only from the signed ALI
 * sign-in cookie, never from an email typed into the request.
 */
jest.mock('../supabase-admin.js', () => {
  const row = { data: { user_id: 'u1', email: 'admin@example.com', role: 'owner' }, error: null };
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => row };
  return { supabaseAdmin: { from: () => chain } };
});

process.env.ALI_SESSION_SECRET = process.env.ALI_SESSION_SECRET || 'test-secret-for-jest-only-123456789';

const { requireSuperAdmin } = require('../ali-admin-auth.js');
const { createSessionToken } = require('../ali-session.js');

function mockRes() {
  const res = { code: null, body: null };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

describe('ALI super admin check', () => {
  test('an admin email in the body, header or URL is not enough', async () => {
    const res = mockRes();
    const req = { method: 'GET', url: '/x?email=admin@example.com', headers: { 'ali-super-admin-email': 'admin@example.com' } };
    expect(await requireSuperAdmin(req, res, { body: { email: 'admin@example.com' } })).toBeNull();
    expect(res.code).toBe(401);
  });

  test('a signed-in admin passes', async () => {
    const token = createSessionToken({ email: 'admin@example.com', isSuperAdmin: true });
    const res = mockRes();
    const out = await requireSuperAdmin({ method: 'GET', headers: { cookie: `ali_session=${encodeURIComponent(token)}` } }, res);
    expect(out).toEqual({ email: 'admin@example.com' });
  });

  test('a forged cookie fails', async () => {
    const res = mockRes();
    const fake = Buffer.from(JSON.stringify({ email: 'admin@example.com', iat: Date.now() })).toString('base64url') + '.bad';
    expect(await requireSuperAdmin({ method: 'GET', headers: { cookie: `ali_session=${fake}` } }, res)).toBeNull();
  });
});
