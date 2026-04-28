import { getValidAdminSession } from '../lib/badLeaderAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = String(req.query?.token || '').trim();
    const session = await getValidAdminSession(token);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    return res.status(200).json({
      ok: true,
      email: session.email,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error('[BLP ADMIN SESSION] Error:', error);
    return res.status(500).json({ error: 'Failed to verify session.' });
  }
}
