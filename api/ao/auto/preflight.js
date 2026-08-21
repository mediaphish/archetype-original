/**
 * GET /api/ao/auto/preflight
 *
 * Checks that all critical infrastructure is in place before Auto commits
 * to a workflow that depends on it. Returns a clear status for each check.
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { scheduledPosts } from '../../../lib/db/scheduledPosts.js';

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
  // The image generation code reads OPEN_API_KEY via /lib/openaiKey.js.
  // Check the same variable name here so preflight reflects actual capability.
  checks.openai_key = !!process.env.OPEN_API_KEY
    ? { ok: true, message: 'OPEN_API_KEY is set' }
    : { ok: false, message: 'OPEN_API_KEY is not set — image generation will fail' };

  // 3. Anthropic key for Auto brain
  checks.anthropic_key = !!process.env.ANTHROPIC_API_KEY
    ? { ok: true, message: 'ANTHROPIC_API_KEY is set' }
    : { ok: false, message: 'ANTHROPIC_API_KEY is not set — Auto brain will fail' };

  // 4. Resend key for email
  checks.resend_key = !!process.env.RESEND_API_KEY
    ? { ok: true, message: 'RESEND_API_KEY is set' }
    : { ok: false, message: 'RESEND_API_KEY is not set — subscriber emails will fail' };

  // 5. X image posting (OAuth 1.0a)
  //
  // X has two entirely separate auth paths, which is why "it has been posting"
  // and "images have never worked" were both true at the same time:
  //
  //   - Text posts use OAuth 2.0 via Connect X. That token lives in the
  //     ao_x_tokens table and refreshes itself. No environment variables.
  //   - Media upload requires OAuth 1.0a, which reads the four variables below.
  //     They have never been set, so no image has ever attached.
  //
  // Before 2026-08-17 a missing-credential image post fell through and posted
  // the image's storage URL as body text, recorded as a success. It fails
  // outright now, which is what finally made this visible.
  //
  // Checked through getSocialCredentials — the same function the posting path
  // uses — so it cannot drift from real capability. Names only, never values.
  try {
    const { getSocialCredentials } = await import('../../../lib/social/config.js');
    const xCreds = getSocialCredentials('twitter', 'personal');
    if (xCreds) {
      checks.x_image_posting = {
        ok: true,
        message: 'X OAuth 1.0a credentials are set — images can attach',
      };
    } else {
      const missing = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_TOKEN_SECRET',
      ].filter((name) => !process.env[name]);
      checks.x_image_posting = {
        ok: false,
        message:
          `X image posts will fail — missing ${missing.join(', ')}. ` +
          'Text-only posts still work via the separate OAuth 2.0 Connect X token.',
      };
    }
  } catch (err) {
    checks.x_image_posting = { ok: false, message: `X credential check failed: ${err.message}` };
  }

  // 6. Supabase connection
  try {
    const { supabaseAdmin } = await import('../../../lib/supabase-admin.js');
    const { error } = await scheduledPosts()
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
