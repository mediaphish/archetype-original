/**
 * GET /api/ao/auto/preflight
 *
 * Checks that all critical infrastructure is in place before Auto commits
 * to a workflow that depends on it. Returns a clear status for each check.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const checks = {};

  // 1. GitHub publish token
  checks.github_token = !!process.env.GITHUB_PUBLISH_TOKEN
    ? { ok: true, message: 'GITHUB_PUBLISH_TOKEN is set' }
    : { ok: false, message: 'GITHUB_PUBLISH_TOKEN is not set — journal publishing will fail' };

  // 2. OpenAI key for DALL-E
  checks.openai_key = !!process.env.OPENAI_API_KEY
    ? { ok: true, message: 'OPENAI_API_KEY is set' }
    : { ok: false, message: 'OPENAI_API_KEY is not set — image generation will fail' };

  // 3. Anthropic key for Auto brain
  checks.anthropic_key = !!process.env.ANTHROPIC_API_KEY
    ? { ok: true, message: 'ANTHROPIC_API_KEY is set' }
    : { ok: false, message: 'ANTHROPIC_API_KEY is not set — Auto brain will fail' };

  // 4. Resend key for email
  checks.resend_key = !!process.env.RESEND_API_KEY
    ? { ok: true, message: 'RESEND_API_KEY is set' }
    : { ok: false, message: 'RESEND_API_KEY is not set — subscriber emails will fail' };

  // 5. Supabase connection
  try {
    const { supabaseAdmin } = await import('../../../lib/supabase-admin.js');
    const { error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id')
      .limit(1);
    checks.supabase = error
      ? { ok: false, message: `Supabase error: ${error.message}` }
      : { ok: true, message: 'Supabase connection is live' };
  } catch (err) {
    checks.supabase = { ok: false, message: `Supabase failed: ${err.message}` };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return res.status(200).json({
    ok: allOk,
    checks,
    summary: allOk
      ? 'All systems ready'
      : 'One or more systems are not ready — see checks for details',
  });
}
