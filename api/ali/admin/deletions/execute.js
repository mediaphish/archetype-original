/**
 * ALI Deletions – Execute (internal)
 * Execute logic lives in lib/ali-deletions-execute.js and is called by initiate.js.
 * This endpoint exists for vercel.json routing; direct use is not supported.
 * Use POST /api/ali/admin/deletions/initiate instead.
 */

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  return res.status(405).json({
    ok: false,
    error: 'Use POST /api/ali/admin/deletions/initiate to run deletions.'
  });
}
