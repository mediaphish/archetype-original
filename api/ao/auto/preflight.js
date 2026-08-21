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

  // 5. X image posting
  //
  // Both text and images now use the single OAuth 2.0 Connect X token stored in
  // ao_x_tokens. Images additionally need the media.write scope on that token,
  // which POST /2/media/upload requires; without it the upload 403s.
  //
  // The four TWITTER_* variables are not consulted here. They belonged to the
  // OAuth 1.0a media path, and X retired the v1.1 endpoints that path used on
  // 2025-06-09.
  //
  // This reports scope presence, which is still an inference. Run
  // /api/ao/auto/x-media-check to observe an actual upload succeed.
  try {
    const { getXAccessToken } = await import('../../../lib/social/xConnection.js');
    const token = await getXAccessToken();
    if (!token.ok || !token.accessToken) {
      checks.x_image_posting = {
        ok: false,
        message: 'No connected X account — connect X from Auto settings',
      };
    } else if (String(token.scope || '').split(/\s+/).includes('media.write')) {
      checks.x_image_posting = {
        ok: true,
        message: 'Connected X token carries media.write — images can attach',
      };
    } else {
      checks.x_image_posting = {
        ok: false,
        message:
          'Connected X token is missing the media.write scope, so image posts will 403. ' +
          'Reconnect X to re-authorize. Text-only posts are unaffected.',
      };
    }
  } catch (err) {
    checks.x_image_posting = { ok: false, message: `X check failed: ${err.message}` };
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
